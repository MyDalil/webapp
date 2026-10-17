import 'server-only'
import { getPayload } from 'payload'
import config from '@payload-config'
import { draftMode } from 'next/headers'
import type { Media, Place } from '@/payload-types'
import { SECTORS, WILAYAS } from '@/platform/referentiel/catalog'
import { RESULT_LABEL, STATUS_LABEL } from '@/modules/confiance'
import { cityPhoto } from './listings'

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

export { RESULT_LABEL, STATUS_LABEL }

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
  cover: string
  credit: string | null
  score: number
  languages: string[]
  pos: [number, number] | null
  exact: boolean
  updated: string
  /** Coup de cœur de l’équipe (sélection éditoriale, jamais liée à un paiement). */
  favorite: boolean
  /** Critères vérifiés « conforme » par DALIL. */
  verified: string[]
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
    photo: mediaUrl(p.photos?.[0], 'thumb') ?? (external(p)[0] ? sized(external(p)[0].url, 960, external(p)[0].width) : cityPhoto(p.city)),
    cover: coverOf(p),
    credit: coverCredit(p)?.text ?? null,
    score: p.score ?? 0,
    languages: (p.languages ?? []) as string[],
    pos,
    exact,
    updated: p.updatedAt,
    favorite: Boolean((p as { favorite?: boolean }).favorite),
    verified: (p.criteria ?? []).filter((c) => c.result === 'ok').map((c) => c.criterion),
  }
}

/** Photo sous licence libre (Commons) : vignette plus légère pour les cartes. */
// Wikimedia ne sert que des largeurs standard (960, 1280, 1920…) et jamais plus large que l’original.
const STEPS = [960, 1280, 1920]
const sized = (url: string, w: number, original?: number | null) => {
  const fit = STEPS.filter((x) => x <= w && (!original || x <= original)).pop() ?? 960
  return url.split('?')[0].replace(/\/(\d+)px-/, `/${fit}px-`)
}
const external = (p: Place) => (p.externalPhotos ?? []).filter((x) => x?.url)
export const coverOf = (p: Place) => mediaUrl(p.photos?.[0], 'cover') ?? (external(p)[0] ? sized(external(p)[0].url, 1920, external(p)[0].width) : cityPhoto(p.city))
/** Crédit de la couverture quand elle vient d’une source libre (obligatoire par la licence). */
export const coverCredit = (p: Place) => {
  if (mediaUrl(p.photos?.[0], 'cover')) return null
  const x = external(p)[0]
  return x ? { text: `Photo : ${x.author} · ${x.license}`, href: x.page } : null
}
export const galleryOf = (p: Place) => [
  ...(p.photos ?? []).flatMap((m) => (m && typeof m === 'object' && m.url ? [{ url: m.sizes?.cover?.url ?? m.url, alt: m.alt, credit: m.credit ?? null, href: null as string | null }] : [])),
  ...external(p).map((x) => ({ url: sized(x.url, 1280, x.width), alt: p.name, credit: `${x.author} · ${x.license}`, href: x.page as string | null })),
]

async function client() {
  return getPayload({ config })
}

/** Adresses publiées (le site public ne voit jamais les brouillons). */
export async function getPlaces(): Promise<PlaceCard[]> {
  try {
    const payload = await client()
    const { docs } = await payload.find({ collection: 'places', where: { _status: { equals: 'published' } }, depth: 1, limit: 5000, sort: '-score', overrideAccess: false })
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

/** Adresse de page d’une wilaya : /villes/alger, /villes/bejaia… */
export const wilayaSlug = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
export const wilayaBySlug = (slug: string) => WILAYAS.find((w) => wilayaSlug(w.name) === slug) ?? null

export type CityTile = { code: string; name: string; slug: string; cover: string; credit: string | null; count: number; highlight: string }

/** Vitrine : meilleures fiches illustrées et wilayas qui ont des lieux à montrer. */
export async function getShowcase(): Promise<{ top: PlaceCard[]; cities: CityTile[]; total: number }> {
  const all = await getPlaces()
  const illustrated = all.filter((p) => p.cover && !p.cover.startsWith('/mockup'))
  const byWilaya = new Map<string, PlaceCard[]>()
  for (const p of illustrated) if (p.wilaya) byWilaya.set(p.wilaya, [...(byWilaya.get(p.wilaya) ?? []), p])
  const cities = [...byWilaya.entries()]
    .map(([name, list]) => ({ code: '', name, slug: wilayaSlug(name), cover: list[0].cover, credit: list[0].credit, count: list.length, highlight: list[0].name }))
    .sort((a, b) => b.count - a.count)
  return { top: illustrated.slice(0, 14), cities, total: all.length }
}

/** Lieux d’une wilaya, déjà classés par score. */
export async function getWilayaPlaces(name: string): Promise<PlaceCard[]> {
  return (await getPlaces()).filter((p) => p.wilaya === name)
}

/** Destination à l’honneur (réglage /admin), avec repli sur le Sahara. */
export async function getFeaturedDestination(): Promise<{ place: PlaceCard; eyebrow: string; title: string; text: string; cta: string } | null> {
  const p = await getPayload({ config })
  const g = (await p.findGlobal({ slug: 'featured-destination', depth: 1, overrideAccess: false }).catch(() => null)) as { place?: number | { slug?: string | null } | null; eyebrow?: string | null; title?: string | null; text?: string | null; cta?: string | null } | null
  const all = await getPlaces()
  const slug = g?.place && typeof g.place === 'object' ? g.place.slug : null
  const chosen = slug ? all.find((x) => x.slug === slug) : undefined
  const place = chosen ?? all.find((x) => /tassili|djanet/i.test(x.name + x.city) && x.cover && !x.cover.startsWith('/mockup')) ?? all[0]
  if (!place) return null
  return {
    place,
    eyebrow: g?.eyebrow || 'Le grand Sud',
    title: g?.title || 'Le Sahara, comme nulle part ailleurs.',
    text: g?.text || 'Canyons de grès, peintures rupestres millénaires et oasis : préparez votre voyage avec des repères fiables.',
    cta: g?.cta || `Découvrir ${place.name}`,
  }
}

export type EventCard = import('./weekend').WeekendEvent & {
  intro: string
  address: string
  priceNote: string
  bookingUrl: string | null
  sourceUrl: string | null
  organizer: string
  contributor: string
  photo: string | null
  credit: string | null
  placeSlug: string | null
}

/** Événements publiés, encore en cours ou à venir (les terminés sont écartés dès la requête). */
export async function getUpcomingEvents(): Promise<EventCard[]> {
  const payload = await getPayload({ config })
  const since = new Date(Date.now() - 60 * 864e5).toISOString()
  const { docs } = await payload.find({ collection: 'events', where: { and: [{ _status: { equals: 'published' } }, { startsAt: { greater_than_equal: since } }] }, depth: 1, limit: 500, sort: 'startsAt', overrideAccess: false })
  const now = Date.now()
  return docs
    .filter((e) => new Date(e.endsAt ?? e.startsAt).getTime() >= now)
    .map((e) => {
      const place = e.place && typeof e.place === 'object' ? (e.place as Place) : null
      const media = e.photo && typeof e.photo === 'object' ? (e.photo as Media) : null
      return {
        slug: e.slug ?? String(e.id),
        title: e.title,
        type: e.type,
        startsAt: e.startsAt,
        endsAt: e.endsAt ?? null,
        wilaya: Number(e.wilaya),
        city: e.city,
        free: Boolean(e.free),
        priceMin: e.free ? null : (e.priceMin ?? null),
        family: Boolean(e.family),
        accessible: (e.accessible ?? 'unknown') as 'yes' | 'no' | 'unknown',
        status: e.reliability === 'confirmed' ? 'confirmed' : 'incomplete',
        intro: e.intro ?? '',
        address: e.address ?? '',
        priceNote: e.priceNote ?? '',
        bookingUrl: e.bookingUrl || null,
        sourceUrl: e.sourceUrl || null,
        organizer: e.organizer ?? '',
        contributor: e.contributor ?? '',
        photo: media ? (media.sizes?.cover?.url ?? media.url ?? null) : place ? coverOf(place) : null,
        credit: media ? ((media as { credit?: string }).credit ?? null) : place ? (coverCredit(place)?.text ?? null) : null,
        placeSlug: place?.slug ?? null,
      }
    })
}
