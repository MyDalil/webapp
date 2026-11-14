import type { Payload } from 'payload'
import { audit } from '@/platform/audit/audit'
import { notify } from '../AgentNotifications'
import { loadRole, stageContext, stagesOf } from './company'
import { callModel, type Llm } from './llm'

type Row = Record<string, unknown> & { id: number }
type Who = { id?: number; name?: string; collection?: string } | null

/**
 * Activation d’un rôle en un clic (ou `/activer <rôle>` sur Telegram) — sans déploiement.
 * Avant la mise en service : test à froid. L’agent lit son dossier company/ et répond à une tâche d’essai,
 * sans aucun outil exécuté. Échec → il reste en réserve et la raison est enregistrée.
 */
export async function activateRole(payload: Payload, slug: string, by: Who, llm: Llm = callModel) {
  const found = await payload.find({ collection: 'agents', where: { slug: { equals: slug } }, limit: 1, depth: 0, overrideAccess: true })
  const a = found.docs[0] as unknown as Row | undefined
  if (!a) return { ok: false, detail: `rôle inconnu : ${slug}` }
  if (a.status === 'active') return { ok: true, detail: 'déjà actif' }
  const role = await loadRole(slug)
  if (!role) return { ok: false, detail: `rôle absent de company/ : ${slug}` }
  const workflow = role.id.workflows[0]
  const stage = (await stagesOf(role, workflow))[0]
  const system = `${await stageContext(role, workflow, stage)}\n\n## Tes outils\n${role.guardrails.tools.map((t) => `- ${t}`).join('\n')}\n\nRéponds par UN objet JSON : {"final": {"report": "<ton rôle en une phrase>"}}`
  const reply = await llm({ provider: a.provider === 'openai' ? 'openai' : 'anthropic', model: String(a.model || role.id.model), system, messages: [{ role: 'user', content: 'Test à froid : présente ton rôle et ton premier outil, en une phrase.' }], maxTokens: 300 })
  let pass = false
  let detail: string
  if (!reply.ok) detail = `modèle ${a.provider} : ${reply.error}${reply.detail ? ` (${reply.detail})` : ''}`
  else {
    await payload.create({ collection: 'ai-usage', overrideAccess: true, data: { feature: 'agent', agent: a.id, inputTokens: reply.inputTokens, outputTokens: reply.outputTokens, costMicros: reply.costMicros, model: String(a.model) } as never })
    const s = reply.text.indexOf('{')
    const e = reply.text.lastIndexOf('}')
    try {
      const out = JSON.parse(reply.text.slice(s, e + 1)) as { final?: { report?: string } }
      pass = Boolean(out.final?.report && out.final.report.length > 10)
      detail = pass ? `réussi : « ${String(out.final!.report).slice(0, 160)} »` : 'réponse sans rapport'
    } catch {
      detail = 'réponse illisible (JSON attendu)'
    }
  }
  await payload.update({
    collection: 'agents',
    id: a.id,
    overrideAccess: true,
    data: { coldTestResult: pass ? 'pass' : 'fail', coldTestAt: new Date().toISOString(), coldTestDetail: detail.slice(0, 250), ...(pass ? { status: 'active' } : {}) } as never,
  })
  const who = by?.name ?? 'Équipe'
  await audit(payload, by ? ({ user: by, payload, context: {} } as never) : undefined, { action: pass ? 'activation' : 'activation refusée', summary: `${pass ? 'a activé' : 'n’a pas pu activer'} le rôle « ${a.name} » — test à froid ${pass ? 'réussi' : 'échoué'} : ${detail}`.slice(0, 400), target: 'agents', targetId: a.id })
  await notify(payload, undefined, { phase: 'order', title: `${pass ? 'Rôle activé' : 'Activation refusée'} : ${a.name}`, body: `${who}. Test à froid : ${detail}`, agentId: a.id, agentLabel: String(a.name) })
  return { ok: pass, detail }
}

export async function reserveRole(payload: Payload, slug: string, by: Who) {
  const found = await payload.find({ collection: 'agents', where: { slug: { equals: slug } }, limit: 1, depth: 0, overrideAccess: true })
  const a = found.docs[0] as unknown as Row | undefined
  if (!a) return { ok: false, detail: `rôle inconnu : ${slug}` }
  await payload.update({ collection: 'agents', id: a.id, overrideAccess: true, data: { status: 'reserve' } as never })
  await notify(payload, undefined, { phase: 'order', title: `Rôle remis en réserve : ${a.name}`, body: by?.name ?? 'Équipe', agentId: a.id, agentLabel: String(a.name) })
  return { ok: true, detail: 'en réserve' }
}
