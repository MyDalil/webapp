import type { SponsorTarget } from './sponsoringCore'

/**
 * Kit « Vérifié sur DALIL » : réservé aux fiches réellement vérifiées, gratuit, jamais lié à un paiement (règle 4).
 * Lecture seule des champs de vérification ; rien ici ne les écrit.
 * - adresses : statut du module confiance « Vérifiée » ou « Labellisée », avec date de vérification ;
 * - praticiens : même règle que le badge public (identité et au moins un diplôme vérifiés par l’équipe) ;
 * - prestataires : identité et statut légal vérifiés par l’équipe ;
 * - annonces : jamais.
 */
export type KitDoc = Record<string, unknown>

export const KIT_COLLECTIONS: readonly SponsorTarget[] = ['places', 'practitioners', 'providers']

export function kitEligible(collection: string, d: KitDoc | null | undefined): boolean {
  if (!d || typeof d.slug !== 'string' || !d.slug) return false
  if (collection === 'places') return d._status === 'published' && (d.verification === 'verified' || d.verification === 'labelled') && Boolean(d.verifiedAt)
  if (collection === 'practitioners') return d.status === 'published' && d.identityVerified === true && Array.isArray(d.diplomas) && d.diplomas.some((x) => (x as { verified?: boolean })?.verified === true)
  if (collection === 'providers') return d.status === 'published' && d.identityVerified === true && d.legalVerified === true
  return false
}

const PUBLIC_PATH: Record<string, string> = { places: '/adresses', practitioners: '/praticiens', providers: '/prestataires' }

/** Adresse publique de la fiche (celle du QR). */
export const kitPath = (collection: string, slug: string) => `${PUBLIC_PATH[collection]}/${slug}`

/** Ce qu’affiche le visuel : nom, catégorie, commune — tels qu’enregistrés, rien d’inventé. */
export function kitCard(collection: string, d: KitDoc): { name: string; category: string | null; city: string | null } {
  const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
  if (collection === 'places') return { name: String(d.name), category: text(d.category), city: text(d.city) }
  if (collection === 'practitioners') return { name: String(d.name), category: text(d.title), city: text(d.city) }
  return { name: String(d.displayName), category: null, city: text(d.baseCommune) }
}
