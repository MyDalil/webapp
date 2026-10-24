import { WILAYA_CENTERS } from '@/platform/referentiel/wilaya-centers'
import { WILAYAS } from '@/platform/referentiel/catalog'
import { NATURE_CATEGORIES } from './filters'

/**
 * « Que faire ce week-end ? » : sélection des événements et des lieux à visiter, selon les filtres.
 * Règles (validées par Rad) : jamais d’événement terminé ; confirmés séparés des informations incomplètes ;
 * un filtre n’est jamais satisfait par une information inconnue (prix, famille, accessibilité).
 * Le week-end algérien : vendredi et samedi, heure d’Alger (UTC+1, sans heure d’été).
 */

export const EVENT_TYPES = [
  ['culture', 'Culture & spectacles'],
  ['festival', 'Festivals & fêtes'],
  ['exposition', 'Expositions'],
  ['sport', 'Sport'],
  ['nature', 'Nature & plein air'],
  ['gastronomie', 'Gastronomie & marchés'],
  ['atelier', 'Ateliers & conférences'],
  ['religieux', 'Vie musulmane'],
] as const
export type EventType = (typeof EVENT_TYPES)[number][0]

export type WeekendEvent = {
  slug: string
  title: string
  type: EventType | string
  startsAt: string
  endsAt: string | null
  wilaya: number
  city: string
  free: boolean
  priceMin: number | null
  family: boolean
  accessible: 'yes' | 'no' | 'unknown'
  status: 'confirmed' | 'incomplete'
}
export type WeekendPlace = { slug: string; name: string; category: string; wilaya: string | null }
export type When = 'weekend' | 'today' | 'week' | 'month' | 'all'
export type WeekendFilters = {
  wilaya?: number | null
  when?: When
  budget?: '' | 'free' | '1000' | '3000'
  distance?: '' | 'wilaya' | '100' | '250'
  family?: boolean
  accessible?: boolean
  type?: string
}

const HOUR = 3600e3
const DAY = 24 * HOUR
const ALGIERS = HOUR // décalage UTC+1

/** Minuit (heure d’Alger) du jour de `d`, en instant UTC. */
const localMidnight = (d: Date) => new Date(Math.floor((d.getTime() + ALGIERS) / DAY) * DAY - ALGIERS)

export function weekendWindow(now: Date, when: When = 'weekend'): { from: Date; to: Date } {
  const today = localMidnight(now)
  const endOf = (dayStart: Date) => new Date(dayStart.getTime() + DAY - 1)
  if (when === 'today') return { from: now, to: endOf(today) }
  if (when === 'week') return { from: now, to: endOf(new Date(today.getTime() + 7 * DAY)) }
  if (when === 'month') return { from: now, to: endOf(new Date(today.getTime() + 30 * DAY)) }
  if (when === 'all') return { from: now, to: new Date(now.getTime() + 3650 * DAY) }
  const dow = new Date(now.getTime() + ALGIERS).getUTCDay() // 5 = vendredi, 6 = samedi
  const friday = dow === 5 ? today : dow === 6 ? new Date(today.getTime() - DAY) : new Date(today.getTime() + (((5 - dow) % 7) + 7) % 7 * DAY)
  const saturdayEnd = endOf(new Date(friday.getTime() + DAY))
  return { from: dow === 5 || dow === 6 ? now : friday, to: saturdayEnd }
}

const CENTER = new Map<number, [number, number]>(Object.entries(WILAYA_CENTERS).map(([k, v]) => [Number(k), v]))
const CODE = new Map(WILAYAS.map((w) => [w.name, w.code]))
function km(a: number, b: number) {
  const p = CENTER.get(a)
  const q = CENTER.get(b)
  if (!p || !q) return a === b ? 0 : Infinity
  const r = Math.PI / 180
  const h = Math.sin(((q[0] - p[0]) * r) / 2) ** 2 + Math.cos(p[0] * r) * Math.cos(q[0] * r) * Math.sin(((q[1] - p[1]) * r) / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}
const near = (code: number | undefined, f: WeekendFilters) => {
  if (!f.wilaya || !f.distance) return true
  if (code == null) return false
  return f.distance === 'wilaya' ? code === f.wilaya : km(f.wilaya, code) <= Number(f.distance)
}

/** Lieux à visiter suggérés selon le type d’activité (sans date : ouverts « selon horaires »). */
export const PLACE_TYPES: Record<string, readonly string[]> = {
  nature: NATURE_CATEGORIES,
  culture: ['Musées', 'Monuments et sites historiques', 'Sites archéologiques', 'Bibliothèques'],
  famille: ['Activités familiales', 'Jardins', 'Parcs naturels et réserves', 'Plages'],
  sport: ['Installations sportives', 'Clubs sportifs'],
  gastronomie: ['Restaurants', 'Cafés', 'Glaciers'],
  religieux: ['Mosquées'],
}
const DEFAULT_PLACES = [...new Set([...PLACE_TYPES.famille, ...PLACE_TYPES.nature, ...PLACE_TYPES.culture])]

export function selectWeekend<E extends WeekendEvent, P extends WeekendPlace>({ events, places, filters: f, now }: { events: E[]; places: P[]; filters: WeekendFilters; now: Date }) {
  const { from, to } = weekendWindow(now, f.when ?? 'weekend')
  const cap = f.budget === '1000' || f.budget === '3000' ? Number(f.budget) : null
  const kept = events
    .filter((e) => {
      const start = new Date(e.startsAt).getTime()
      const end = new Date(e.endsAt ?? e.startsAt).getTime()
      return end >= now.getTime() && start <= to.getTime() && end >= from.getTime()
    })
    .filter((e) => !f.type || e.type === f.type)
    .filter((e) => (f.budget === 'free' ? e.free : cap == null || e.free || (e.priceMin != null && e.priceMin <= cap)))
    .filter((e) => !f.family || e.family)
    .filter((e) => !f.accessible || e.accessible === 'yes')
    .filter((e) => near(e.wilaya, f))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))

  // Les lieux n’ont pas encore de prix, d’accueil des enfants ni d’accessibilité vérifiés : on ne les promet pas.
  const placesHidden = Boolean(f.budget || f.family || f.accessible)
  const categories = f.type ? (PLACE_TYPES[f.type] ?? []) : DEFAULT_PLACES
  const suggested = placesHidden ? [] : places.filter((p) => categories.includes(p.category) && near(p.wilaya ? CODE.get(p.wilaya) : undefined, f)).slice(0, 8)

  return { confirmed: kept.filter((e) => e.status === 'confirmed'), incomplete: kept.filter((e) => e.status !== 'confirmed'), places: suggested, placesHidden, window: { from, to } }
}
