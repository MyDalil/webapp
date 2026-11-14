import type { Payload, PayloadRequest, Where } from 'payload'
import { FORBIDDEN_SECTOR, touchesForbidden } from '../referentiel'

/**
 * Outils réels des agents. La politique (exécuter / proposer / refuser) est appliquée AVANT par le moteur.
 * Lecture : champs choisis, jamais d’adresse email ni de pièce. Écriture : sous l’identité de l’agent (audit, garde-fous).
 * Un outil pas encore branché le dit (« non branché »), il ne simule jamais un succès.
 */
type Ctx = { payload: Payload; req: PayloadRequest; agentId: number | string; taskId: number | string }
type Tool = (input: Record<string, unknown>, ctx: Ctx) => Promise<string>

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const json = (v: unknown) => JSON.stringify(v).slice(0, 1500)

const READABLE: Record<string, { title: string; fields: string[] }> = {
  places: { title: 'name', fields: ['name', 'sector', 'category', 'city', 'intro', 'verification', 'verifiedAt'] },
  procedures: { title: 'title', fields: ['title', 'theme', 'online'] },
  events: { title: 'title', fields: ['title', 'startsAt', 'city'] },
  providers: { title: 'displayName', fields: ['displayName', 'categories', 'wilaya', 'status'] },
  classifieds: { title: 'title', fields: ['title', 'category', 'status', 'price', 'agentVerdict', 'reports'] },
  media: { title: 'alt', fields: ['alt', 'filename'] },
}

const notWired = (tool: string): Tool => async () => `non branché : l’outil « ${tool} » arrive avec l’écran correspondant du cockpit. Rien n’a été fait.`

export const TOOL_IMPL: Record<string, Tool> = {
  'read-content': async (input, { payload }) => {
    const collection = str(input.collection, 40) || 'places'
    const spec = READABLE[collection]
    if (!spec) return `collection non autorisée : ${collection}`
    const query = str(input.query, 80)
    const limit = Math.min(Math.max(Number(input.limit) || 5, 1), 5)
    // Vie musulmane : jamais lue par un agent, quel que soit le texte de la tâche (mosquées et lieux de prière exclus).
    const and: Where[] = []
    if (query) and.push({ [spec.title]: { like: query } })
    if (collection === 'places') and.push({ sector: { not_equals: FORBIDDEN_SECTOR } })
    const r = await payload.find({ collection: collection as never, where: and.length ? { and } : undefined, limit, depth: 0, overrideAccess: true, select: Object.fromEntries(spec.fields.map((f) => [f, true])) as never })
    return json({ total: r.totalDocs, docs: r.docs })
  },
  'read-inbox': async (_input, { payload }) => {
    const r = await payload.find({ collection: 'submissions', where: { status: { equals: 'new' } }, limit: 5, depth: 0, overrideAccess: true, sort: '-createdAt', select: { subject: true, kind: true, status: true, createdAt: true } as never })
    return json({ total: r.totalDocs, docs: r.docs })
  },
  'read-health': async (_input, { payload }) => {
    const r = await payload.find({ collection: 'error-logs', where: { resolved: { equals: false } }, limit: 5, depth: 0, overrideAccess: true, sort: '-lastSeen' })
    return json({ total: r.totalDocs, docs: r.docs.map((d) => ({ id: d.id, message: String((d as { message?: unknown }).message ?? '').slice(0, 160), count: (d as { count?: number }).count })) })
  },
  'message-agents': async (input, { payload, req, taskId }) => {
    const body = str(input.body, 2000)
    if (!body) return 'message vide : rien envoyé'
    const to = str(input.to, 40)
    let toAgent: number | undefined
    let toHuman: 'patron' | 'equipe' | undefined
    if (to === 'said' || to === 'patron') toHuman = 'patron'
    else if (to === 'equipe' || to === 'rad') toHuman = 'equipe'
    else {
      const a = await payload.find({ collection: 'agents', where: { slug: { equals: to } }, limit: 1, depth: 0, overrideAccess: true })
      if (!a.docs[0]) return `destinataire inconnu : ${to}`
      toAgent = a.docs[0].id as number
    }
    await payload.create({ collection: 'agent-messages', req, overrideAccess: false, data: { body, task: taskId as number, toAgent, toHuman, kind: (['rapport', 'question', 'note'] as const).find((k) => k === input.kind) ?? 'note' } })
    return `message envoyé à ${to}`
  },
  'create-tasks': async (input, { payload, req, taskId }) => {
    const title = str(input.title, 160)
    const instructions = str(input.instructions, 3000)
    if (!title || !instructions) return 'titre et consignes obligatoires'
    if (touchesForbidden(title, instructions)) return 'refus : Vie musulmane, hors périmètre des agents'
    const slug = str(input.agent, 40)
    const target = slug ? (await payload.find({ collection: 'agents', where: { slug: { equals: slug } }, limit: 1, depth: 0, overrideAccess: true })).docs[0] : null
    if (slug && !target) return `rôle inconnu : ${slug}`
    if (target && (target as { status?: string }).status !== 'active') return `rôle « ${slug} » en réserve ou en pause : demande son activation à Saïd ou Rad`
    const t = await payload.create({ collection: 'agent-tasks', req, overrideAccess: false, data: { title, instructions, agent: target?.id as number | undefined, parent: taskId as number, status: 'new' } as never })
    return `sous-tâche créée #${t.id}${slug ? ` pour ${slug}` : ''}`
  },
  'write-alt-text': async (input, { payload, req }) => {
    const id = Number(input.mediaId)
    const alt = str(input.alt, 200)
    if (!id || alt.length < 8) return 'mediaId et texte alternatif (8 caractères minimum) obligatoires'
    if (touchesForbidden(alt)) return 'refus : Vie musulmane'
    // Photo d’une mosquée ou d’un lieu de prière (y compris à la corbeille ou en brouillon) : interdit aux agents.
    const sacred = await payload.count({ collection: 'places', overrideAccess: true, trash: true, where: { and: [{ photos: { in: [id] } }, { sector: { equals: FORBIDDEN_SECTOR } }] } })
    if (sacred.totalDocs) return 'refus : photo liée à la Vie musulmane (réservée à Saïd)'
    await payload.update({ collection: 'media', id, req, overrideAccess: true, data: { alt } })
    return `texte alternatif écrit pour l’image #${id}`
  },
  'review-classifieds': async (input, { payload, req }) => {
    const id = Number(input.classifiedId)
    const verdict = str(input.verdict, 30)
    if (!id || !verdict) return 'classifiedId et verdict obligatoires'
    await payload.update({ collection: 'classifieds', id, req, overrideAccess: false, data: { agentVerdict: verdict, agentNote: str(input.note, 500) } as never })
    return `avis enregistré sur l’annonce #${id} (un humain publie ou refuse)`
  },
  translate: notWired('translate'),
  'suggest-tags': notWired('suggest-tags'),
  'fix-broken-links': notWired('fix-broken-links'),
  'web-search': notWired('web-search'),
}

export async function runToolImpl(tool: string, input: Record<string, unknown>, ctx: Ctx): Promise<string> {
  const impl = TOOL_IMPL[tool]
  if (!impl) return `outil inconnu : ${tool}`
  return impl(input, ctx)
}
