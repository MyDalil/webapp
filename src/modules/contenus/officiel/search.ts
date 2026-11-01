import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, Payload } from 'payload'
import { indexRows, removeRow, replaceType, type SearchRow } from '@/platform/search/store'
import { themeByKey } from './themes'

type Doc = Record<string, unknown> & { id: number | string }
const str = (v: unknown) => (typeof v === 'string' ? v : '')
const texts = (v: unknown) => (Array.isArray(v) ? v.map((x) => str((x as { text?: unknown }).text)).filter(Boolean).join(' ') : '')

/** Ligne d’index d’une démarche publiée (`null` : à retirer). */
export function procedureRow(d: Doc): SearchRow | null {
  if (d.status !== 'published' || !d.slug || !d.title) return null
  const theme = themeByKey(str(d.theme))
  return {
    type: 'demarche',
    id: String(d.id),
    url: `/demarches/${str(d.slug)}`,
    title: str(d.title),
    subtitle: [theme?.label, d.online ? 'En ligne' : null].filter(Boolean).join(' · '),
    badge: d.online ? 'En ligne' : null,
    boost: d.online ? 0.2 : 0,
    text: [theme?.label, theme?.sub, str(d.summary), str(d.platform), str(d.where), texts(d.documents)].filter(Boolean).join(' '),
  }
}

/** Ligne d’index d’une ambassade ou d’un consulat. */
export function representationRow(d: Doc): SearchRow | null {
  if (d.status !== 'published' || !d.slug || !d.name) return null
  const kind = d.kind === 'ambassade' ? 'Ambassade' : d.kind === 'consulat-general' ? 'Consulat général' : 'Consulat'
  return {
    type: 'consulat',
    id: String(d.id),
    url: `/demarches/consulats#${str(d.slug)}`,
    title: str(d.name),
    subtitle: `${kind} · ${str(d.city)}, ${str(d.country)}`,
    text: ['consulat ambassade algerie', str(d.country), str(d.city), str(d.jurisdiction)].filter(Boolean).join(' '),
  }
}

const hook =
  (row: (d: Doc) => SearchRow | null, type: 'demarche' | 'consulat'): CollectionAfterChangeHook =>
  async ({ doc, req }) => {
    try {
      const r = row(doc as Doc)
      if (r) await indexRows(req.payload, [r])
      else await removeRow(req.payload, type, (doc as Doc).id)
    } catch {
      // l’index se reconstruit chaque semaine : un échec ponctuel ne bloque jamais l’enregistrement
    }
    return doc
  }
const unhook =
  (type: 'demarche' | 'consulat'): CollectionAfterDeleteHook =>
  async ({ doc, req }) => {
    await removeRow(req.payload, type, (doc as Doc).id).catch(() => {})
    return doc
  }

export const indexProcedure = hook(procedureRow, 'demarche')
export const unindexProcedure = unhook('demarche')
export const indexRepresentation = hook(representationRow, 'consulat')
export const unindexRepresentation = unhook('consulat')

async function reindex(payload: Payload, collection: 'procedures' | 'representations', type: 'demarche' | 'consulat', row: (d: Doc) => SearchRow | null) {
  const { docs } = await payload.find({ collection: collection as never, where: { status: { equals: 'published' } }, depth: 0, limit: 10000, pagination: false, overrideAccess: true })
  const rows = (docs as unknown as Doc[]).map(row).filter((r): r is SearchRow => r !== null)
  await replaceType(payload, type, rows)
  return rows.length
}
export const reindexProcedures = (p: Payload) => reindex(p, 'procedures', 'demarche', procedureRow)
export const reindexRepresentations = (p: Payload) => reindex(p, 'representations', 'consulat', representationRow)
