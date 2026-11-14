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

/**
 * Photo d’illustration haut de gamme par catégorie de lieu public (Pexels, licence gratuite, usage commercial ;
 * site : /images/photos, Wikimedia Commons). Affichée « Photo d’illustration » quand le lieu n’a pas de vraie photo.
 * Règles (Rad, 2026-11-15) : format paysage, net, sans visage d’enfant ; jamais un monument identifiable pour un autre lieu.
 */
const pexels = (id: number) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1600`
const CATEGORY_PHOTO: Record<string, { src: string; credit: string }> = {
  Écoles: { src: pexels(10987722), credit: 'Belem Aziz · Pexels' },
  Crèches: { src: pexels(12168815), credit: 'Ali Ahmad Danesh · Pexels' },
  'Formation professionnelle': { src: pexels(12168815), credit: 'Ali Ahmad Danesh · Pexels' },
  Universités: { src: pexels(31070811), credit: 'Dave Garcia · Pexels' },
  Mosquées: { src: pexels(40053949), credit: 'Astrel Fisher · Pexels' },
  'Écoles coraniques': { src: '/images/photos/coran.webp', credit: 'Lecture du Coran · Wikimedia Commons' },
  Hôpitaux: { src: pexels(11660581), credit: 'Printexstar · Pexels' },
  Cliniques: { src: pexels(11660581), credit: 'Printexstar · Pexels' },
  Ministères: { src: pexels(12711847), credit: 'Sidali · Pexels' },
  Administrations: { src: pexels(12711847), credit: 'Sidali · Pexels' },
  'Services municipaux': { src: pexels(8874194), credit: 'Djamel Ramdani · Pexels' },
  'Contacts utiles et urgences': { src: '/images/photos/protection-civile.webp', credit: 'Protection civile · Jawi13 · CC BY-SA 4.0' },
  'Gares et stations': { src: pexels(17315130), credit: 'Kostas Dimopoulos · Pexels' },
  Bibliothèques: { src: pexels(15238618), credit: 'Diego F. Parra · Pexels' },
}
export const categoryPhoto = (category?: string | null) => CATEGORY_PHOTO[category ?? ''] ?? null

/** Photo de la ville si DALIL en a une ; sinon visuel neutre (jamais la photo d’une autre ville). */
export const knownCityPhoto = (city?: string | null) => CITY_PHOTO[(city ?? '').toLowerCase()] ?? null
export const cityPhoto = (city: string) => knownCityPhoto(city) ?? '/images/lieu.svg'

export const formatDate = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso)) : null
