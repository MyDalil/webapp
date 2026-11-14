import { sql } from '@payloadcms/db-postgres'
import { createLocalReq, type Payload, type PayloadRequest } from 'payload'
import { audit, type AgentRun } from '@/platform/audit/audit'
import { getControls } from '@/platform/controls/Controls'
import { modesOf } from '../policy'
import { loadRole, stageContext, stagesOf } from './company'
import { type AgentDoc, type Controls, runTask, type TaskDoc } from './engine'
import { callModel, type Llm } from './llm'
import { runToolImpl } from './tools'

type Row = Record<string, unknown> & { id: number }
const monthStart = () => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString() }

async function sumAi(payload: Payload, where: Record<string, unknown>) {
  const r = await payload.find({ collection: 'ai-usage', where: { and: [{ createdAt: { greater_than_equal: monthStart() } }, where] } as never, pagination: false, depth: 0, overrideAccess: true, select: { costMicros: true } as never })
  return r.docs.reduce((n, d) => n + (Number((d as { costMicros?: number }).costMicros) || 0), 0)
}

export async function controlsFor(payload: Payload): Promise<Controls> {
  const c = await getControls(payload)
  return {
    killSwitch: (c.killSwitch ?? 'off') as Controls['killSwitch'],
    agentsEnabled: c.agentsEnabled !== false,
    globalBudgetMicros: c.agentsMonthlyBudgetUsd == null ? null : c.agentsMonthlyBudgetUsd * 1_000_000,
    globalSpentMicros: await sumAi(payload, { feature: { equals: 'agent' } }),
  }
}

/** Requête locale au nom de l’agent : ses droits, ses garde-fous, son nom dans l’audit. */
export async function agentReq(payload: Payload, agent: Row, run: AgentRun): Promise<PayloadRequest> {
  return createLocalReq({ user: { ...agent, collection: 'agents' } as never, context: { agentRun: run } }, payload)
}

export async function agentDocFor(payload: Payload, a: Row): Promise<{ doc: AgentDoc; stages: string[]; workflow: string } | null> {
  const role = await loadRole(String(a.slug))
  if (!role) return null
  const workflow = role.id.workflows[0]
  const stages = await stagesOf(role, workflow)
  const doc: AgentDoc = {
    id: a.id,
    slug: String(a.slug),
    name: String(a.name),
    provider: (a.provider === 'openai' ? 'openai' : 'anthropic'),
    model: String(a.model || role.id.model),
    toolModes: modesOf(a.toolModes as never),
    tools: Array.isArray(a.tools) && a.tools.length ? (a.tools as string[]) : role.guardrails.tools,
    maxSteps: Number(a.maxStepsPerTask) || role.guardrails.max_steps,
    budgetUsdPerTask: role.guardrails.budget_usd_per_task,
    monthlyBudgetUsd: (a.monthlyBudgetUsd as number | null) ?? null,
  }
  return { doc, stages, workflow }
}

/** Fait avancer une tâche avec son agent (le CEO si aucun). */
export async function runOne(payload: Payload, task: Row, deadline: number, llm: Llm = callModel) {
  const agentId = (task.agent as number | null) ?? (await payload.find({ collection: 'agents', where: { slug: { equals: 'ceo' } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]?.id
  if (!agentId) return { task: task.id, outcome: 'skipped', reason: 'aucun agent ni CEO' }
  const a = (await payload.findByID({ collection: 'agents', id: agentId as number, depth: 0, overrideAccess: true })) as unknown as Row
  if (a.status !== 'active') return { task: task.id, outcome: 'skipped', reason: `agent ${a.slug} : ${a.status}` }
  // Tâche sans agent (« Le CEO choisit », message Telegram libre) : attribuée au CEO, sinon ses écritures sont refusées.
  if (task.agent == null) await payload.update({ collection: 'agent-tasks', id: task.id, overrideAccess: true, data: { agent: agentId } as never })
  const built = await agentDocFor(payload, a)
  if (!built) return { task: task.id, outcome: 'skipped', reason: `rôle ${a.slug} absent de company/` }
  const role = (await loadRole(String(a.slug)))!
  const run: AgentRun = { agentSlug: String(a.slug), department: String(a.department ?? role.id.department), taskId: task.id }
  const req = await agentReq(payload, a, run)
  const r = await runTask(built.doc, {
    getTask: async () => (await payload.findByID({ collection: 'agent-tasks', id: task.id, depth: 0, overrideAccess: true })) as unknown as TaskDoc,
    updateTask: async (patch) => { await payload.update({ collection: 'agent-tasks', id: task.id, req, overrideAccess: false, data: patch as never }) },
    controls: () => controlsFor(payload),
    agentSpentMonthMicros: () => sumAi(payload, { agent: { equals: a.id } }),
    stages: built.stages,
    context: (stage) => stageContext(role, built.workflow, stage),
    llm,
    runTool: (tool, input, { step }) => { run.step = step; run.tool = tool; return runToolImpl(tool, input, { payload, req, agentId: a.id, taskId: task.id }) },
    recordCost: async (c) => { await payload.create({ collection: 'ai-usage', overrideAccess: true, data: { feature: 'agent', agent: a.id, inputTokens: c.inputTokens, outputTokens: c.outputTokens, costMicros: c.costMicros, model: c.model } as never }) },
    onRefusal: async ({ tool, reason, step }) => { run.step = step; run.tool = tool; await audit(payload, req, { action: 'refus', summary: `outil « ${tool} » refusé (${reason})`, target: 'agent-tasks', targetId: task.id }) },
    deadline,
  })
  return { task: task.id, agent: a.slug, ...r }
}

/**
 * Traite la file, une seule passe à la fois. Verrou en base, pris en UNE requête atomique (sûr avec un pool
 * de connexions) ; il dure la passe + 60 s et expire seul (une passe interrompue ne bloque jamais la suivante).
 */
export async function runQueue(payload: Payload, opts: { budgetMs?: number; llm?: Llm } = {}) {
  const deadline = Date.now() + (opts.budgetMs ?? 50_000)
  const db = payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<{ rows: Array<Record<string, unknown>> }> } }
  // Durée du verrou : la passe entière + 60 s. La valeur prise sert de jeton : seule cette passe le libère.
  const ttl = Math.ceil((deadline - Date.now()) / 1000) + 60
  const got = await db.drizzle.execute(
    sql`insert into agent_run_lock (id, locked_until) values (1, now() + make_interval(secs => ${ttl})) on conflict (id) do update set locked_until = excluded.locked_until where agent_run_lock.locked_until < now() returning locked_until::text as token`,
  )
  if (!got.rows.length) return { ran: [], note: 'une autre passe est en cours' }
  const token = String(got.rows[0].token)
  try {
    const tasks = await payload.find({ collection: 'agent-tasks', where: { status: { in: ['new', 'running'] } }, sort: 'createdAt', limit: 10, depth: 0, overrideAccess: true })
    const ran = []
    for (const t of tasks.docs as unknown as Row[]) {
      if (Date.now() > deadline) break
      ran.push(await runOne(payload, t, deadline, opts.llm).catch((e: Error) => ({ task: t.id, outcome: 'error', reason: e.message })))
    }
    return { ran }
  } finally {
    await db.drizzle.execute(sql`update agent_run_lock set locked_until = now() where id = 1 and locked_until::text = ${token}`)
  }
}
