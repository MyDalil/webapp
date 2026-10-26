import data from './listings.json'

export type Listing = {
  slug: string
  name: string
  category: string
  city: string
  sector: string
  sectorTitle: string
  intro: string
  place: string
  criteria: [string, string][]
  source: string | null
  updated: string | null
}

export const LISTINGS = data as Listing[]

/** Photo réelle de la ville (crédits sur /credits-photos), sinon visuel de la maquette. */
const CITY_PHOTO: Record<string, string> = {
  alger: '/images/algeria/alger.webp',
  oran: '/images/algeria/oran.webp',
  constantine: '/images/algeria/constantine.webp',
  bejaia: '/images/algeria/bejaia.webp',
  béjaïa: '/images/algeria/bejaia.webp',
  tlemcen: '/images/algeria/tlemcen.webp',
  annaba: '/images/algeria/annaba.webp',
}

/** Photo de la ville si DALIL en a une ; sinon visuel neutre (jamais la photo d’une autre ville). */
export const knownCityPhoto = (city?: string | null) => CITY_PHOTO[(city ?? '').toLowerCase()] ?? null
export const cityPhoto = (city: string) => knownCityPhoto(city) ?? '/images/lieu.svg'

export const formatDate = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso)) : null
