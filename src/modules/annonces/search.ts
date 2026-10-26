import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, Payload } from 'payload'
import type { Classified } from '@/payload-types'
import { WILAYAS } from '@/platform/referentiel/catalog'
import { communeName } from '@/platform/referentiel/communes'
import { indexRows, removeRow, replaceType, type SearchRow } from '@/platform/search/store'
import { CATEGORIES, categoryLabel, dealLabel, priceLabel, subLabel } from './referentiel'

const wilayaName = (code?: string | null) => WILAYAS.find((w) => String(w.code) === code)?.name ?? ''

/** Ligne d’index d’une annonce en ligne (publiée, non expirée). Un exemple est classé après les vraies. */
export function classifiedRow(c: Partial<Classified> & { id: number | string }, now = Date.now()): SearchRow | null {
  if (c.status !== 'published' || !c.slug || !c.title || !c.category) return null
  if (c.expiresAt && Date.parse(c.expiresAt) <= now) return null
  const [cat, sub] = String(c.subcategory ?? '').split(':')
  return {
    type: 'annonce',
    id: String(c.id),
    url: `/annonces/${c.category}/${c.slug}`,
    title: c.title,
    subtitle: [subLabel(cat, sub), priceLabel({ category: c.category, price: c.price, priceMode: c.priceMode, deal: c.deal }), communeName(c.commune) ?? wilayaName(c.wilaya)].filter(Boolean).join(' · '),
    wilaya: c.wilaya ?? null,
    badge: c.example ? 'Exemple' : null,
    boost: c.example ? -0.6 : 0.1,
    text: ['annonce', categoryLabel(c.category), subLabel(cat, sub), dealLabel(c.deal), c.brand, c.model, c.sector, (c.description ?? '').slice(0, 400), wilayaName(c.wilaya)].filter(Boolean).join(' '),
  }
}

export const indexClassified: CollectionAfterChangeHook = async ({ doc, req }) => {
  try {
    const row = classifiedRow(doc)
    if (row) await indexRows(req.payload, [row])
    else await removeRow(req.payload, 'annonce', doc.id)
  } catch {
    // reconstruction quotidienne
  }
  return doc
}
export const unindexClassified: CollectionAfterDeleteHook = async ({ doc, req }) => {
  await removeRow(req.payload, 'annonce', doc.id).catch(() => {})
  return doc
}

export async function reindexClassifieds(payload: Payload) {
  const { docs } = await payload.find({ collection: 'classifieds', where: { status: { equals: 'published' } }, depth: 0, limit: 20000, pagination: false, overrideAccess: true })
  const rows = docs.map((d) => classifiedRow(d)).filter((r): r is SearchRow => r !== null)
  await replaceType(payload, 'annonce', rows)
  return rows.length
}

const SYNONYMS: Record<string, string> = {
  immobilier: 'logement appartement maison location vente louer acheter',
  emploi: 'travail job recrutement offre poste',
  vehicules: 'voiture auto moto occasion',
  objets: 'vendre acheter occasion',
  'immobilier:appartement': 'f2 f3 f4 logement',
  'immobilier:chambre': 'colocation etudiant',
  'vehicules:voiture': 'auto automobile',
  'objets:high-tech': 'telephone smartphone ordinateur',
}

/** Catégories et types d’annonces : une ligne chacun. */
export function annoncesTaxonomyRows(): SearchRow[] {
  return [
    { type: 'rubrique', id: 'annonces', url: '/annonces', title: 'Annonces', subtitle: 'Acheter, vendre, louer, recruter', text: 'petites annonces', boost: 0.8 },
    ...CATEGORIES.flatMap((c) => [
      { type: 'categorie' as const, id: `annonces:${c.value}`, url: `/annonces/${c.value}`, title: c.label, subtitle: 'Annonces', text: [c.lead, SYNONYMS[c.value] ?? ''].join(' '), boost: 1 },
      ...c.subs.map(([v, l]) => ({ type: 'categorie' as const, id: `annonces:${c.value}:${v}`, url: `/annonces/${c.value}?type=${v}`, title: l, subtitle: `Annonces · ${c.label}`, text: SYNONYMS[`${c.value}:${v}`] ?? '', boost: 0.9 })),
    ]),
  ]
}
