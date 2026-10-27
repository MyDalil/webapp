import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, Payload } from 'payload'
import type { Place } from '@/payload-types'
import { SECTORS, WILAYAS } from '@/platform/referentiel/catalog'
import { categoryPath, slugify } from '@/platform/referentiel/slug'
import { indexRows, removeRow, replaceType, type SearchRow } from '@/platform/search/store'

const STATUS: Record<string, string> = { spotted: 'À vérifier', checking: 'En vérification', verified: 'Vérifiée', labelled: 'Label Excellence' }
const BOOST: Record<string, number> = { verified: 0.3, labelled: 0.5 }
const wilayaName = (code?: string | null) => WILAYAS.find((w) => String(w.code) === code)?.name ?? ''

/** Ligne d’index d’une adresse publiée (`null` : à retirer de l’index). */
export function placeRow(p: Partial<Place> & { id: number | string }): SearchRow | null {
  if (p._status !== 'published' || !p.slug || !p.name) return null
  const sector = SECTORS.find((s) => s.slug === p.sector)
  return {
    type: 'adresse',
    id: String(p.id),
    url: `/adresses/${p.slug}`,
    title: p.name,
    subtitle: [p.category, p.city].filter(Boolean).join(' · '),
    wilaya: p.wilaya ?? null,
    badge: STATUS[p.verification ?? 'spotted'] ?? null,
    boost: (BOOST[p.verification ?? ''] ?? 0) + (p.favorite ? 0.2 : 0),
    lat: typeof p.lat === 'number' ? p.lat : null,
    lng: typeof p.lng === 'number' ? p.lng : null,
    text: [p.nameAr, p.nameEn, p.category, sector?.title, p.city, p.place, p.address, wilayaName(p.wilaya), (p.intro ?? '').slice(0, 400)].filter(Boolean).join(' '),
  }
}

/** Index : mise à jour à chaque enregistrement d’une fiche. */
export const indexPlace: CollectionAfterChangeHook = async ({ doc, req }) => {
  try {
    const row = placeRow(doc)
    if (row) await indexRows(req.payload, [row])
    else await removeRow(req.payload, 'adresse', doc.id)
  } catch {
    // l’index se reconstruit chaque jour : un échec ponctuel ne bloque jamais l’enregistrement
  }
  return doc
}
export const unindexPlace: CollectionAfterDeleteHook = async ({ doc, req }) => {
  await removeRow(req.payload, 'adresse', doc.id).catch(() => {})
  return doc
}

/** Reconstruction complète des adresses publiées. */
export async function reindexPlaces(payload: Payload) {
  const { docs } = await payload.find({
    collection: 'places',
    where: { _status: { equals: 'published' } },
    depth: 0,
    limit: 100000,
    pagination: false,
    overrideAccess: true,
    select: { name: true, nameAr: true, nameEn: true, slug: true, sector: true, category: true, city: true, place: true, address: true, wilaya: true, intro: true, verification: true, favorite: true, _status: true, lat: true, lng: true },
  })
  const rows = docs.map((d) => placeRow(d as Place)).filter((r): r is SearchRow => r !== null)
  await replaceType(payload, 'adresse', rows)
  return rows.length
}

/** Mots que les gens tapent pour une catégorie (sans accent). */
const SYNONYMS: Record<string, string> = {
  Hôpitaux: 'hopital chu ehs urgences hospitalier',
  Cliniques: 'clinique privee',
  Médecins: 'medecin docteur generaliste cabinet medical',
  Pharmacies: 'pharmacie medicament pharmacien',
  Laboratoires: 'laboratoire analyses prise de sang',
  Mosquées: 'mosquee masjid jamaa priere',
  'Salles de prière': 'priere moussala',
  Écoles: 'ecole primaire cem lycee',
  Universités: 'universite faculte fac',
  Crèches: 'creche garderie',
  Banques: 'banque agence bancaire',
  'Gares et stations': 'gare train bus station',
  Administrations: 'mairie apc daira administration',
  Ambassades: 'ambassade consulat visa',
  'Contacts utiles et urgences': 'urgence police pompiers samu protection civile',
  Plages: 'plage mer',
  Restaurants: 'restaurant manger',
  'Location de véhicules': 'location voiture',
  Avocats: 'avocat juriste',
  Notaires: 'notaire acte',
}

/** Rubriques et catégories de l’annuaire : une ligne par secteur, une par catégorie (pages référencées). */
export function annuaireTaxonomyRows(): SearchRow[] {
  return SECTORS.flatMap((s) => [
    { type: 'rubrique' as const, id: `annuaire:${s.slug}`, url: `/annuaire/${s.slug}`, title: s.title, subtitle: 'Annuaire', text: [s.description, ...s.categories].join(' '), boost: 0.8 },
    ...s.categories.map((c) => ({
      type: 'categorie' as const,
      id: `annuaire:${s.slug}:${slugify(c)}`,
      url: categoryPath(s.slug, c),
      title: c,
      subtitle: `Annuaire · ${s.title}`,
      text: [s.title, SYNONYMS[c] ?? ''].join(' '),
      boost: 1,
    })),
  ])
}
