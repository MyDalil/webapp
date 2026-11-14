import { describe, expect, it } from 'vitest'
import { type AgentDoc, type Controls, type EngineDeps, runTask, type TaskDoc } from './engine'
import type { LlmReply } from './llm'

const AGENT: AgentDoc = { id: 1, slug: 'redacteur', name: 'Rédacteur', provider: 'anthropic', model: 'claude-haiku-5-5', tools: ['read-content', 'draft-content', 'translate'], maxSteps: 12, budgetUsdPerTask: 0.5, monthlyBudgetUsd: 20 }
const OK: Controls = { killSwitch: 'off', agentsEnabled: true, globalBudgetMicros: 60_000_000, globalSpentMicros: 0 }
const reply = (o: unknown, cost = 10): LlmReply => ({ ok: true, text: JSON.stringify(o), inputTokens: 10, outputTokens: 5, costMicros: cost, pricing: 'exact' })

function harness(script: LlmReply[], over: Partial<EngineDeps> = {}, task: Partial<TaskDoc> = {}) {
  let t: TaskDoc = { id: 7, title: 'Horaires du Jardin d’Essai', instructions: 'Vérifier les horaires.', status: 'new', steps: 0, spentMicros: 0, ...task }
  const updates: Array<Record<string, unknown>> = []
  const tools: string[] = []
  const refusals: string[] = []
  let i = 0
  const deps: EngineDeps = {
    getTask: async () => t,
    updateTask: async (p) => { updates.push(p); t = { ...t, ...p } },
    controls: async () => OK,
    agentSpentMonthMicros: async () => 0,
    stages: ['01-collecte', '02-redaction'],
    context: async (s) => `contexte ${s}`,
    llm: async () => script[Math.min(i++, script.length - 1)],
    runTool: async (tool) => { tools.push(tool); return `ok ${tool}` },
    recordCost: async () => {},
    onRefusal: async ({ tool, reason }) => { refusals.push(`${tool}:${reason}`) },
    deadline: Date.now() + 60_000,
    ...over,
  }
  return { deps, updates, tools, refusals, get task() { return t } }
}

describe('moteur d’agent', () => {
  it('parcourt les étapes, exécute un outil autorisé et termine « À valider » avec la proposition', async () => {
    const h = harness([
      reply({ action: { tool: 'read-content', input: { query: 'Jardin' } } }),
      reply({ final: { report: 'Sources trouvées.' } }),
      reply({ action: { tool: 'draft-content', input: { field: 'intro', value: 'Texte' } } }),
      reply({ final: { report: 'Brouillon prêt.', proposal: { type: 'note' } } }),
    ])
    expect(await runTask(AGENT, h.deps)).toEqual({ outcome: 'review' })
    expect(h.tools).toEqual(['read-content'])
    expect(h.task.status).toBe('review')
    expect(h.task.steps).toBe(4)
    expect(h.task.spentMicros).toBe(40)
    expect((h.task.proposal as { items: unknown[] }).items).toEqual([{ tool: 'draft-content', input: { field: 'intro', value: 'Texte' } }, { type: 'note' }])
  })

  it('s’arrête dès que la tâche est mise en pause par un humain', async () => {
    let calls = 0
    const h = harness([reply({ action: { tool: 'read-content', input: {} } })], {
      llm: async () => { calls++; return reply({ action: { tool: 'read-content', input: {} } }) },
    })
    const base = h.deps.getTask
    h.deps.getTask = async () => { const t = await base(); return calls >= 2 ? { ...t, status: 'paused' } : t }
    expect(await runTask(AGENT, h.deps)).toEqual({ outcome: 'stopped', reason: 'tâche paused' })
    expect(calls).toBe(2)
  })

  it('arrêt général : aucune étape', async () => {
    const h = harness([reply({ final: { report: 'x' } })], { controls: async () => ({ ...OK, killSwitch: 'stop' }) })
    expect(await runTask(AGENT, h.deps)).toEqual({ outcome: 'stopped', reason: 'arrêt général' })
    expect(h.task.steps).toBe(0)
  })

  it('budget global non défini : aucun agent ne travaille', async () => {
    const h = harness([reply({ final: { report: 'x' } })], { controls: async () => ({ ...OK, globalBudgetMicros: null }) })
    expect((await runTask(AGENT, h.deps)).outcome).toBe('stopped')
  })

  it('budget de la tâche atteint : échec', async () => {
    const h = harness([reply({ action: { tool: 'read-content', input: {} } }, 600_000)])
    const r = await runTask(AGENT, h.deps)
    expect(r).toEqual({ outcome: 'failed', reason: 'budget de la tâche atteint' })
    expect(h.task.status).toBe('failed')
  })

  it('outil hors du rôle et outil interdit : refusés, jamais exécutés', async () => {
    const h = harness([
      reply({ action: { tool: 'delete-record', input: { id: 1 } } }),
      reply({ action: { tool: 'write-alt-text', input: {} } }),
      reply({ final: { report: 'fin' } }),
      reply({ final: { report: 'fin' } }),
    ])
    await runTask(AGENT, h.deps)
    expect(h.tools).toEqual([])
    expect(h.refusals).toEqual(['delete-record:hors-role', 'write-alt-text:hors-role'])
  })

  it('Vie musulmane dans la tâche : échec immédiat, aucun appel au modèle', async () => {
    let calls = 0
    const h = harness([], { llm: async () => { calls++; return reply({}) } }, { title: 'Horaires pour la Omra' })
    expect(await runTask(AGENT, h.deps)).toEqual({ outcome: 'failed', reason: 'hors périmètre : Vie musulmane' })
    expect(calls).toBe(0)
  })

  it('clé du modèle absente : échec explicite « non configuré »', async () => {
    const h = harness([{ ok: false, error: 'non configuré', detail: 'ANTHROPIC_API_KEY absente' }])
    expect(await runTask(AGENT, h.deps)).toEqual({ outcome: 'failed', reason: 'modèle anthropic : non configuré (ANTHROPIC_API_KEY absente)' })
  })

  it('deux réponses illisibles : échec', async () => {
    const h = harness([{ ok: true, text: 'bonjour', inputTokens: 1, outputTokens: 1, costMicros: 1, pricing: 'exact' }])
    expect(await runTask(AGENT, h.deps)).toEqual({ outcome: 'failed', reason: 'deux réponses illisibles de suite' })
  })

  it('le réglage Neon « propose » transforme un outil exécutable en proposition', async () => {
    const h = harness([reply({ action: { tool: 'read-content', input: { q: 1 } } }), reply({ final: { report: 'a' } }), reply({ final: { report: 'b' } })])
    await runTask({ ...AGENT, toolModes: { 'read-content': 'propose' } }, h.deps)
    expect(h.tools).toEqual([])
    expect((h.task.proposal as { items: unknown[] }).items[0]).toEqual({ tool: 'read-content', input: { q: 1 } })
  })

  it('délai dépassé : la tâche reste en cours pour la prochaine passe', async () => {
    const h = harness([reply({ final: { report: 'x' } })], { deadline: Date.now() - 1 })
    expect(await runTask(AGENT, h.deps)).toEqual({ outcome: 'deadline' })
    expect(h.task.status).toBe('running')
  })
})
