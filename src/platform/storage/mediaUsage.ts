import type { PayloadRequest } from 'payload'
import { idsInDoc, mediaRefs, replaceInDoc, type Ref } from './usage'

type Col = { slug: string; fields: never[]; trash?: boolean; versions?: { drafts?: unknown } | boolean; admin?: { useAsTitle?: string } }

/**
 * Variantes de lecture : la fiche telle quelle, et pour une collection avec brouillons sa dernière version.
 * Les fiches à la corbeille comptent aussi : une photo d’une fiche restaurable n’est jamais « inutilisée ».
 */
const variants = (c: Col) => [{ trash: Boolean(c.trash) }, ...(typeof c.versions === 'object' && c.versions?.drafts ? [{ trash: Boolean(c.trash), draft: true }] : [])]
export type Use = { collection: string; id: number | string; title: string }

const collections = (req: PayloadRequest) =>
  (req.payload.config.collections as unknown as Col[]).filter((c) => c.slug !== 'media' && mediaRefs(c.slug, c.fields).length)

/**
 * Identifiants de toutes les photos utilisées quelque part (droits de la session).
 * Ne lit que les documents qui ont une photo, et seulement leurs champs photo : l’annuaire compte des dizaines de milliers de fiches.
 */
export async function usedMediaIds(req: PayloadRequest): Promise<Set<string>> {
  const used = new Set<string>()
  for (const c of collections(req)) {
    const refs = mediaRefs(c.slug, c.fields)
    const select = Object.fromEntries(refs.map((r) => [r.path.split('.')[0], true]))
    const where = { or: refs.map((r) => ({ [r.path]: { exists: true } })) }
    for (const v of variants(c)) {
      const res = await req.payload.find({ collection: c.slug as never, req, overrideAccess: false, depth: 0, pagination: false, select: select as never, where, ...v })
      for (const d of res.docs) idsInDoc(c.fields as never, d as Record<string, unknown>, used)
    }
  }
  return used
}

/** Documents qui utilisent une photo. */
export async function usageOf(req: PayloadRequest, id: number | string): Promise<Use[]> {
  const out: Use[] = []
  for (const c of collections(req)) {
    const refs: Ref[] = mediaRefs(c.slug, c.fields)
    const seen = new Set<string>()
    for (const v of variants(c)) {
      const res = await req.payload.find({ collection: c.slug as never, req, overrideAccess: false, depth: 0, pagination: false, where: { or: refs.map((r) => ({ [r.path]: { in: [id] } })) }, ...v })
      for (const d of res.docs as Array<Record<string, unknown> & { id: number }>) {
        if (seen.has(String(d.id))) continue
        seen.add(String(d.id))
        const t = c.admin?.useAsTitle ? d[c.admin.useAsTitle] : undefined
        out.push({ collection: c.slug, id: d.id, title: `${typeof t === 'string' && t ? t : `#${d.id}`}${d.deletedAt ? ' (corbeille)' : ''}` })
      }
    }
  }
  return out
}

/** Remplace la photo `from` par `to` dans chaque document qui l’utilise. Chaque écriture passe par l’audit. */
export async function replaceEverywhere(req: PayloadRequest, from: number, to: number) {
  const done: Use[] = []
  const failed: Array<Use & { error: string }> = []
  const byCol = new Map((collections(req)).map((c) => [c.slug, c]))
  for (const u of await usageOf(req, from)) {
    const c = byCol.get(u.collection)!
    const doc = (await req.payload.findByID({ collection: u.collection as never, id: u.id, req, overrideAccess: false, depth: 0, trash: Boolean(c.trash) })) as Record<string, unknown>
    const patch = replaceInDoc(c.fields as never, doc, from, to)
    if (!patch) continue
    try {
      await req.payload.update({ collection: u.collection as never, id: u.id, data: patch as never, req, overrideAccess: false })
      done.push(u)
    } catch (e) {
      failed.push({ ...u, error: e instanceof Error ? e.message : String(e) })
    }
  }
  return { done, failed }
}
