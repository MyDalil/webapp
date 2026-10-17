import type { PlaceCard } from './queries'

/** Catégories du thème « Nature & Espaces » (menu Découvrir, carte Nature & Bien-être). */
export const NATURE_CATEGORIES = ['Parcs naturels et réserves', 'Plages', 'Cascades, gorges et grottes', 'Lacs et oasis', 'Jardins'] as const

export type PlaceFilters = {
  q?: string
  sector?: string
  category?: string
  theme?: 'nature' | ''
  wilaya?: string
  city?: string
  status?: string
  language?: string
  favorite?: boolean
  /** Critères exigés : vérifiés « conforme » par DALIL (jamais une information déclarée). */
  criteria?: string[]
}

type Filterable = Pick<PlaceCard, 'name' | 'category' | 'city' | 'wilaya' | 'sector' | 'sectorTitle' | 'place' | 'status' | 'languages' | 'favorite' | 'verified'>

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’'-]/g, ' ').toLowerCase()

/** Filtres de l’annuaire : une seule règle, partagée par la page et ses tests. */
export function filterPlaces<T extends Filterable>(places: T[], f: PlaceFilters): T[] {
  const needle = norm((f.q ?? '').trim())
  const nature = f.theme === 'nature' && !f.category
  return places.filter(
    (p) =>
      (!f.sector || p.sector === f.sector) &&
      (!needle || norm(`${p.name} ${p.category} ${p.city} ${p.place} ${p.sectorTitle} ${p.wilaya ?? ''}`).includes(needle)) &&
      (!f.category || p.category === f.category) &&
      (!nature || (NATURE_CATEGORIES as readonly string[]).includes(p.category)) &&
      (!f.wilaya || p.wilaya === f.wilaya) &&
      (!f.city || p.city === f.city) &&
      (!f.status || p.status === f.status) &&
      (!f.language || p.languages.includes(f.language)) &&
      (!f.favorite || p.favorite) &&
      (!f.criteria?.length || f.criteria.every((c) => p.verified.includes(c))),
  )
}

/** Critères vérifiés conformes sur au moins un lieu : les seuls qu’on propose comme filtre. */
export const verifiedCriteria = (places: Pick<PlaceCard, 'verified'>[]) => [...new Set(places.flatMap((p) => p.verified))].sort((a, b) => a.localeCompare(b, 'fr'))
