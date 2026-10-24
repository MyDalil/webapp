import data from './communes.json'

/**
 * Communes d’Algérie (Wikidata, CC0), importées par `scripts/import/fetch-communes.mjs`.
 * `id` stable = code wilaya + nom (ex. « 16-bab-el-oued »). Coordonnées = centre de la commune,
 * pour un calcul de distance interne, sans service de géocodage tiers.
 */
export type Commune = { id: string; name: string; ar: string | null; wilaya: number; lat: number | null; lng: number | null; qid: string }

export const COMMUNES = data as Commune[]
const BY_ID = new Map(COMMUNES.map((c) => [c.id, c]))

export const commune = (id: string | null | undefined) => (id ? BY_ID.get(id) ?? null : null)
export const communeName = (id: string | null | undefined) => commune(id)?.name ?? null
export const communesOf = (wilaya: number | string) => COMMUNES.filter((c) => c.wilaya === Number(wilaya))

/** Distance à vol d’oiseau entre deux centres de communes (km), ou null si une coordonnée manque. */
export function distanceKm(a: string, b: string) {
  const x = commune(a)
  const y = commune(b)
  if (x?.lat == null || x.lng == null || y?.lat == null || y.lng == null) return null
  const rad = Math.PI / 180
  const dLat = (y.lat - x.lat) * rad
  const dLng = (y.lng - x.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(x.lat * rad) * Math.cos(y.lat * rad) * Math.sin(dLng / 2) ** 2
  return Math.round(12742 * Math.asin(Math.sqrt(h)))
}
