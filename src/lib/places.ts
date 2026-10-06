import 'server-only'
import { getPayload } from 'payload'
import config from '@payload-config'
import { draftMode } from 'next/headers'
import type { Media, Place } from '@/payload-types'
import { SECTORS, WILAYAS } from '@/content/catalog'
import { cityPhoto } from '@/content/listings'

/** Centre des principales villes : position approximative tant que la fiche n’a pas de coordonnées exactes. */
const CITY_CENTER: Record<string, [number, number]> = {
  alger: [36.7538, 3.0588],
  oran: [35.6971, -0.6308],
  constantine: [36.365, 6.6147],
  annaba: [36.9, 7.7667],
  tlemcen: [34.8828, -1.3167],
  'béjaïa': [36.7509, 5.0567],
  bejaia: [36.7509, 5.0567],
  blida: [36.4703, 2.8277],
  'sétif': [36.1898, 5.4108],
  'tizi ouzou': [36.7118, 4.0459],
  batna: [35.5559, 6.1741],
  biskra: [34.8504, 5.7281],
  'ghardaïa': [32.4909, 3.6735],
  tamanrasset: [22.785, 5.5228],
  boumerdès: [36.7664, 3.4772],
  tipaza: [36.5897, 2.4475],
  mostaganem: [35.9311, 0.0892],
  jijel: [36.8206, 5.7667],
  skikda: [36.8762, 6.9092],
}

export const STATUS_LABEL: Record<NonNullable<Place['verification']>, string> = {
  spotted: 'À vérifier',
  checking: 'En vérification',
  verified: 'Vérifiée',
  labelled: 'Label Excellence',
}

export const RESULT_LABEL: Record<string, string> = {
  pending: 'À confirmer',
  ok: 'Conforme',
  partial: 'Partiel',
  ko: 'Non conforme',
  na: 'Non concerné',
}

export type PlaceCard = {
  slug: string
  name: string
  category: string
  city: string
  wilaya: string | null
  sector: string
  sectorTitle: string
  place: string
  status: NonNullable<Place['verification']>
  photo: string
  pos: [number, number] | null
  exact: boolean
  updated: string
}

const mediaUrl = (m: number | Media | undefined, size: 'thumb' | 'cover') =>
  m && typeof m === 'object' ? (m.sizes?.[size]?.url ?? m.url ?? null) : null

export const sectorTitle = (slug: string) => SECTORS.find((s) => s.slug === slug)?.title ?? slug
export const wilayaName = (code?: string | null) => (code ? (WILAYAS.find((w) => String(w.code) === code)?.name ?? null) : null)

export function position(p: Pick<Place, 'lat' | 'lng' | 'city'>): { pos: [number, number] | null; exact: boolean } {
  if (typeof p.lat === 'number' && typeof p.lng === 'number') return { pos: [p.lat, p.lng], exact: true }
  const c = CITY_CENTER[p.city.trim().toLowerCase()]
  return { pos: c ?? null, exact: false }
}

export function toCard(p: Place): PlaceCard {
  const { pos, exact } = position(p)
  return {
    slug: p.slug ?? String(p.id),
    name: p.name,
    category: p.category,
    city: p.city,
    wilaya: wilayaName(p.wilaya),
    sector: p.sector,
    sectorTitle: sectorTitle(p.sector),
    place: p.place ?? '',
    status: p.verification ?? 'spotted',
    photo: mediaUrl(p.photos?.[0], 'thumb') ?? cityPhoto(p.city),
    pos,
    exact,
    updated: p.updatedAt,
  }
}

export const coverOf = (p: Place) => mediaUrl(p.photos?.[0], 'cover') ?? cityPhoto(p.city)
export const galleryOf = (p: Place) =>
  (p.photos ?? []).flatMap((m) => (m && typeof m === 'object' && m.url ? [{ url: m.sizes?.cover?.url ?? m.url, alt: m.alt, credit: m.credit ?? null }] : []))

async function client() {
  return getPayload({ config })
}

/** Adresses publiées (le site public ne voit jamais les brouillons). */
export async function getPlaces(): Promise<PlaceCard[]> {
  try {
    const payload = await client()
    const { docs } = await payload.find({ collection: 'places', where: { _status: { equals: 'published' } }, depth: 1, limit: 2000, sort: 'name', overrideAccess: false })
    return docs.map(toCard)
  } catch {
    return []
  }
}

/** Une fiche ; en mode aperçu depuis /admin, la dernière version enregistrée (brouillon compris). */
export async function getPlace(slug: string): Promise<Place | null> {
  const preview = (await draftMode()).isEnabled
  const payload = await client()
  const { docs } = await payload.find({
    collection: 'places',
    where: preview ? { slug: { equals: slug } } : { and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }] },
    depth: 1,
    limit: 1,
    draft: preview,
    overrideAccess: preview,
  })
  return docs[0] ?? null
}

export async function getPlaceSlugs(): Promise<string[]> {
  try {
    const payload = await client()
    const { docs } = await payload.find({ collection: 'places', where: { _status: { equals: 'published' } }, limit: 2000, depth: 0, select: { slug: true }, overrideAccess: false })
    return docs.flatMap((d) => (d.slug ? [d.slug] : []))
  } catch {
    return []
  }
}
