import 'server-only'
import type { Payload } from 'payload'
import { DRAFT_ONLY_CHANNELS, type ActionContext } from '@/platform/actions/types'
import { audit } from '@/platform/audit/audit'
import { trashCollections, daysLeft } from '@/platform/trash'
import { requireRole, staffReq, OpsError } from './context'
import { previousFromAudit } from './restoreCore'

type CollectionCfg = { slug: string; versions?: boolean | { drafts?: unknown } }
const config = (payload: Payload, slug: string) => {
  const c = (payload.config.collections as unknown as CollectionCfg[]).find((x) => x.slug === slug)
  if (!c) throw new OpsError(`Collection inconnue : ${slug}.`)
  return c
}

/**
 * Revenir à la version précédente d’un document. Collections à versions : restoreVersion (Payload).
 * Autres : réapplique les valeurs « avant » de la dernière modification du journal d’audit, si elles y sont complètes.
 * La restauration est une nouvelle écriture (nouvelle version, nouvelle ligne d’audit) : l’historique n’est jamais effacé.
 * Depuis une IA, Telegram ou WhatsApp, la version restaurée revient en brouillon (jamais de publication).
 */
export async function restorePrevious(payload: Payload, input: { collection: string; id: number | string; versionId?: string }, ctx: ActionContext) {
  requireRole(ctx, 'admin')
  const c = config(payload, input.collection)
  const req = await staffReq(payload, ctx)
  const asDraft = DRAFT_ONLY_CHANNELS.includes(ctx.channel)
  if (c.versions) {
    const { docs } = await payload.findVersions({ collection: c.slug as never, where: { parent: { equals: input.id } }, sort: '-updatedAt', limit: 2, depth: 0, overrideAccess: true })
    const target = input.versionId ? { id: input.versionId } : docs[1]
    if (!target) throw new OpsError('Aucune version précédente pour ce document.')
    const drafts = typeof c.versions === 'object' && !!c.versions.drafts
    await payload.restoreVersion({ collection: c.slug as never, id: String(target.id), req, overrideAccess: true, depth: 0, ...(drafts && asDraft ? { draft: true } : {}) } as never)
    await audit(payload, req, { action: 'restauration', summary: `a restauré la version précédente (${String(target.id)})${asDraft ? ' en brouillon' : ''}`, target: c.slug, targetId: input.id, actionId: ctx.actionId })
    return { ok: true, methode: 'versions', version: String(target.id), brouillon: drafts && asDraft }
  }
  const { docs } = await payload.find({ collection: 'audit-log', where: { and: [{ target: { equals: c.slug } }, { targetId: { equals: String(input.id) } }, { action: { in: ['modification', 'restauration'] } }] }, sort: '-createdAt', limit: 1, depth: 0, overrideAccess: true })
  const prev = previousFromAudit((docs[0] as { changes?: unknown } | undefined)?.changes)
  if (!prev.ok) throw new OpsError(prev.reason)
  await payload.update({ collection: c.slug as never, id: input.id, data: prev.data as never, req, overrideAccess: true, depth: 0 })
  await audit(payload, req, { action: 'restauration', summary: `a rétabli les valeurs précédentes (${Object.keys(prev.data).join(', ')})`, target: c.slug, targetId: input.id, actionId: ctx.actionId })
  return { ok: true, methode: 'journal', champs: Object.keys(prev.data) }
}

/** Corbeille : sans `id`, liste ce qui est restaurable ; avec `id`, remet le document en place (option Payload `trash`). */
export async function restoreFromTrash(payload: Payload, input: { collection: string; id?: number | string }, ctx: ActionContext) {
  requireRole(ctx, 'admin')
  if (!trashCollections(payload).includes(input.collection)) throw new OpsError(`La corbeille n’est pas active pour « ${input.collection} ».`)
  if (input.id == null) {
    const r = await payload.find({ collection: input.collection as never, trash: true, where: { deletedAt: { exists: true } }, sort: '-deletedAt', limit: 50, depth: 0, overrideAccess: true })
    return { corbeille: (r.docs as unknown as { id: number; deletedAt: string; name?: string; title?: string }[]).map((d) => ({ id: d.id, titre: d.name ?? d.title ?? String(d.id), joursRestants: daysLeft(d.deletedAt) })) }
  }
  const req = await staffReq(payload, ctx)
  await payload.update({ collection: input.collection as never, id: input.id, trash: true, data: { deletedAt: null } as never, req, overrideAccess: true, depth: 0 })
  await audit(payload, req, { action: 'restauration', summary: 'a sorti le document de la corbeille', target: input.collection, targetId: input.id, actionId: ctx.actionId })
  return { ok: true }
}
