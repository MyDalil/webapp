import { decide, type Mode } from '../policy'
import { touchesForbidden } from '../referentiel'
import type { Llm, Msg } from './llm'

/**
 * Boucle d’un agent sur une tâche (exécuteur unique, méthode ICM).
 * Avant chaque étape : relire la tâche (pause, annulation, directive), l’arrêt général, les budgets.
 * Chaque appel d’outil passe par la politique d’autonomie : refus, proposition ou exécution.
 * L’agent ne valide jamais : il termine en « À valider » (ou « Échec »).
 */
export type TaskDoc = { id: number | string; title: string; instructions: string; directive?: string | null; status: string; steps?: number | null; maxSteps?: number | null; budgetUsd?: number | null; spentMicros?: number | null; stage?: string | null; trace?: TraceItem[] | null; proposal?: unknown; rubrique?: string | null }
export type AgentDoc = { id: number | string; slug: string; name: string; provider: 'anthropic' | 'openai'; model: string; toolModes?: Partial<Record<string, Mode>>; tools: string[]; maxSteps: number; budgetUsdPerTask: number; monthlyBudgetUsd?: number | null }
export type TraceItem = { step: number; stage: string; kind: 'outil' | 'proposition' | 'refus' | 'fin' | 'erreur'; tool?: string; detail: string }
export type Controls = { killSwitch: 'off' | 'drain' | 'stop' | 'cut'; agentsEnabled: boolean; globalBudgetMicros: number | null; globalSpentMicros: number }
export type Outcome = { outcome: 'review' | 'failed' | 'stopped' | 'deadline'; reason?: string }

export type EngineDeps = {
  getTask: () => Promise<TaskDoc>
  updateTask: (patch: Partial<TaskDoc> & { status?: string; result?: string; error?: string }) => Promise<void>
  controls: () => Promise<Controls>
  agentSpentMonthMicros: () => Promise<number>
  stages: string[]
  context: (stage: string) => Promise<string>
  llm: Llm
  runTool: (tool: string, input: Record<string, unknown>, ctx: { step: number }) => Promise<string>
  recordCost: (r: { inputTokens: number; outputTokens: number; costMicros: number; model: string }) => Promise<void>
  onRefusal: (r: { tool: string; reason: string; step: number }) => Promise<void>
  deadline: number
  now?: () => number
}

const PROTOCOL = `
## Réponse
Réponds par UN objet JSON, sans texte autour :
- appel d’outil : {"action": {"tool": "<outil>", "input": {…}}}
- fin d’étape : {"final": {"report": "<rapport court ASD-STE100>", "proposal": {…} | null}}
N’utilise que les outils listés. Un refus est définitif : ne réessaie pas le même outil.`

const parse = (text: string): { action?: { tool: string; input?: Record<string, unknown> }; final?: { report?: string; proposal?: unknown } } | null => {
  const s = text.indexOf('{')
  const e = text.lastIndexOf('}')
  if (s < 0 || e <= s) return null
  try {
    return JSON.parse(text.slice(s, e + 1))
  } catch {
    return null
  }
}

export async function runTask(agent: AgentDoc, d: EngineDeps): Promise<Outcome> {
  const now = d.now ?? Date.now
  let task = await d.getTask()
  if (task.status === 'new') {
    await d.updateTask({ status: 'running', stage: task.stage ?? d.stages[0] })
    task = await d.getTask()
  }
  const trace: TraceItem[] = [...(task.trace ?? [])]
  const proposals: unknown[] = Array.isArray((task.proposal as { items?: unknown[] } | null)?.items) ? [...(task.proposal as { items: unknown[] }).items] : []
  let illegible = 0
  const fail = async (reason: string): Promise<Outcome> => {
    trace.push({ step: task.steps ?? 0, stage: task.stage ?? '', kind: 'erreur', detail: reason })
    await d.updateTask({ status: 'failed', error: reason.slice(0, 250), trace: trace.slice(-30) })
    return { outcome: 'failed', reason }
  }

  for (;;) {
    if (now() > d.deadline) return { outcome: 'deadline' }
    task = await d.getTask()
    if (task.status !== 'running') return { outcome: 'stopped', reason: `tâche ${task.status}` }

    const c = await d.controls()
    if (c.killSwitch !== 'off') return { outcome: 'stopped', reason: 'arrêt général' }
    if (!c.agentsEnabled) return { outcome: 'stopped', reason: 'agents désactivés' }
    if (c.globalBudgetMicros === null) return { outcome: 'stopped', reason: 'budget mensuel global non défini (Commandes)' }
    if (c.globalSpentMicros >= c.globalBudgetMicros) return fail('budget mensuel global atteint')
    const taskBudget = (task.budgetUsd ?? agent.budgetUsdPerTask) * 1_000_000
    if ((task.spentMicros ?? 0) >= taskBudget) return fail('budget de la tâche atteint')
    if (agent.monthlyBudgetUsd != null && (await d.agentSpentMonthMicros()) >= agent.monthlyBudgetUsd * 1_000_000) return fail('budget mensuel de l’agent atteint')
    const maxSteps = task.maxSteps ?? agent.maxSteps
    if ((task.steps ?? 0) >= maxSteps) return fail(`nombre maximal d’étapes atteint (${maxSteps})`)
    if (touchesForbidden(task.title, task.instructions, task.directive, task.rubrique)) return fail('hors périmètre : Vie musulmane')

    const stage = task.stage && d.stages.includes(task.stage) ? task.stage : d.stages[0]
    const step = (task.steps ?? 0) + 1
    const system = `${await d.context(stage)}\n\n## Tes outils\n${agent.tools.map((t) => `- ${t}`).join('\n')}\n${PROTOCOL}`
    const history: Msg[] = [
      { role: 'user', content: `Tâche : ${task.title}\nConsignes : ${task.instructions}${task.directive ? `\nDirective en cours (prioritaire) : ${task.directive}` : ''}\nÉtape : ${stage} (${d.stages.indexOf(stage) + 1}/${d.stages.length})` },
      ...trace.filter((t) => t.stage === stage).slice(-8).map((t) => ({ role: 'user' as const, content: t.kind === 'outil' ? `Résultat de ${t.tool} : ${t.detail}` : `${t.kind === 'refus' ? 'Refus' : 'Note'} (${t.tool ?? ''}) : ${t.detail}` })),
    ]
    const reply = await d.llm({ provider: agent.provider, model: agent.model, system, messages: history, maxTokens: 1500 })
    if (!reply.ok) return fail(`modèle ${agent.provider} : ${reply.error}${reply.detail ? ` (${reply.detail})` : ''}`)
    await d.recordCost({ inputTokens: reply.inputTokens, outputTokens: reply.outputTokens, costMicros: reply.costMicros, model: agent.model })
    const spentMicros = (task.spentMicros ?? 0) + reply.costMicros

    const out = parse(reply.text)
    if (!out || (!out.action && !out.final)) {
      illegible += 1
      trace.push({ step, stage, kind: 'erreur', detail: 'réponse illisible (JSON attendu)' })
      await d.updateTask({ steps: step, spentMicros, stage, trace: trace.slice(-30) })
      if (illegible >= 2) return fail('deux réponses illisibles de suite')
      continue
    }
    illegible = 0

    if (out.action) {
      const tool = String(out.action.tool ?? '')
      const input = out.action.input ?? {}
      const dec = agent.tools.includes(tool)
        ? decide({ tool, agentModes: agent.toolModes, texts: [task.title, task.instructions, task.directive, JSON.stringify(input)], killSwitch: c.killSwitch })
        : ({ mode: 'deny', reason: 'hors-role' } as const)
      if (dec.mode === 'deny') {
        trace.push({ step, stage, kind: 'refus', tool, detail: dec.reason })
        await d.onRefusal({ tool, reason: dec.reason, step })
      } else if (dec.mode === 'propose') {
        proposals.push({ tool, input })
        trace.push({ step, stage, kind: 'proposition', tool, detail: 'ajouté à la proposition (validation humaine)' })
      } else {
        const result = await d.runTool(tool, input, { step }).catch((e: Error) => `échec : ${e.message}`)
        trace.push({ step, stage, kind: 'outil', tool, detail: result.slice(0, 1500) })
      }
      await d.updateTask({ steps: step, spentMicros, stage, trace: trace.slice(-30), proposal: proposals.length ? { items: proposals } : task.proposal })
      continue
    }

    // Fin d’étape : étape suivante, ou fin du travail (à valider).
    const report = String(out.final?.report ?? '').slice(0, 4000)
    if (out.final?.proposal) proposals.push(out.final.proposal)
    trace.push({ step, stage, kind: 'fin', detail: report.slice(0, 500) })
    const next = d.stages[d.stages.indexOf(stage) + 1]
    if (next) {
      await d.updateTask({ steps: step, spentMicros, stage: next, trace: trace.slice(-30), result: report, proposal: proposals.length ? { items: proposals } : task.proposal })
      continue
    }
    await d.updateTask({ steps: step, spentMicros, status: 'review', result: report, trace: trace.slice(-30), proposal: proposals.length ? { items: proposals } : null })
    return { outcome: 'review' }
  }
}
