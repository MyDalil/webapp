import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, Payload } from 'payload'
import type { Provider } from '@/payload-types'
import { WILAYAS } from '@/platform/referentiel/catalog'
import { communeName } from '@/platform/referentiel/communes'
import { indexRows, removeRow, replaceType, type SearchRow } from '@/platform/search/store'
import { ACTIVITIES, CATEGORIES, activityLabel, categoryLabel } from './activities'

const wilayaName = (code?: string | null) => WILAYAS.find((w) => String(w.code) === code)?.name ?? ''

/** Ligne d’index d’un prestataire publié (un exemple est classé après les vrais). */
export function providerRow(p: Partial<Provider> & { id: number | string }): SearchRow | null {
  if (p.status !== 'published' || !p.slug || !p.displayName) return null
  const cats = ((p.categories ?? []) as string[]).map(categoryLabel)
  const acts = ((p.activities ?? []) as string[]).map(activityLabel)
  return {
    type: 'prestataire',
    id: String(p.id),
    url: `/prestataires/${p.slug}`,
    title: p.displayName,
    subtitle: [cats.join(', '), communeName(p.baseCommune) ?? wilayaName(p.wilaya)].filter(Boolean).join(' · '),
    wilaya: p.wilaya ?? null,
    badge: p.demo ? 'Exemple' : 'Vérifié DALIL',
    boost: p.demo ? -0.6 : 0.3,
    text: [...cats, ...acts, 'prestataire service à domicile', (p.bio ?? '').slice(0, 300), wilayaName(p.wilaya)].filter(Boolean).join(' '),
  }
}

export const indexProvider: CollectionAfterChangeHook = async ({ doc, req }) => {
  try {
    const row = providerRow(doc)
    if (row) await indexRows(req.payload, [row])
    else await removeRow(req.payload, 'prestataire', doc.id)
  } catch {
    // reconstruction quotidienne
  }
  return doc
}
export const unindexProvider: CollectionAfterDeleteHook = async ({ doc, req }) => {
  await removeRow(req.payload, 'prestataire', doc.id).catch(() => {})
  return doc
}

export async function reindexProviders(payload: Payload) {
  const { docs } = await payload.find({ collection: 'providers', where: { status: { equals: 'published' } }, depth: 0, limit: 10000, pagination: false, overrideAccess: true })
  const rows = docs.map(providerRow).filter((r): r is SearchRow => r !== null)
  await replaceType(payload, 'prestataire', rows)
  return rows.length
}

const SYNONYMS: Record<string, string> = {
  plomberie: 'plombier fuite robinet chauffe-eau',
  electricite: 'electricien panne courant',
  peinture: 'peintre',
  menuiserie: 'menuisier',
  climatisation: 'clim climatiseur',
  'menage-regulier': 'femme de menage nettoyage',
  'grand-menage': 'nettoyage',
  'baby-sitting': 'nounou babysitter',
  'depannage-pc': 'ordinateur reparation',
  'lecture-coran': 'coran quran',
}

/** Catégories et activités de services : une ligne chacune, vers la recherche filtrée. */
export function servicesTaxonomyRows(): SearchRow[] {
  return [
    { type: 'rubrique', id: 'services', url: '/services', title: 'Services à domicile', subtitle: 'Services', text: 'prestataire artisan domicile depannage', boost: 0.8 },
    ...CATEGORIES.map((c) => ({ type: 'categorie' as const, id: `services:${c.value}`, url: `/services/${c.value}`, title: c.label, subtitle: 'Services à domicile', text: c.activities.map(([, l]) => l).join(' '), boost: 1 })),
    ...ACTIVITIES.map((a) => ({ type: 'categorie' as const, id: `services:${a.category}:${a.value}`, url: `/services/${a.category}?activite=${a.value}`, title: a.label, subtitle: `Services · ${categoryLabel(a.category)}`, text: SYNONYMS[a.value] ?? '', boost: 0.9 })),
  ]
}
