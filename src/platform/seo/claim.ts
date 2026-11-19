/**
 * Lien « Vous êtes ce professionnel ? » d’une fiche de l’annuaire (revendication gratuite, décision pros 2026-10-06).
 * Jamais sur un lieu public sans exploitant à revendiquer (administration, site naturel, mosquée, gare, hôpital).
 */
const NOT_CLAIMABLE_SECTORS = new Set(['administrations-services-publics'])
const NOT_CLAIMABLE = new Set([
  'Mosquées',
  'Salles de prière',
  'Hôpitaux',
  'Musées',
  'Monuments et sites historiques',
  'Sites archéologiques',
  'Parcs naturels et réserves',
  'Cascades, gorges et grottes',
  'Lacs et oasis',
  'Bibliothèques',
  'Parcs',
  'Plages',
  'Jardins',
  'Gares et stations',
])
/** Texte validé (sante, DECISIONS) pour les médecins et dentistes. */
export const PRACTITIONER_CLAIM = 'Vous êtes ce praticien ? Activez la prise de rendez-vous'
export const PRO_CLAIM = 'Vous êtes ce professionnel ? Gérez cette fiche gratuitement'

export function placeClaimLabel(sector: string | null | undefined, category: string | null | undefined): string | null {
  if (!sector || !category) return null
  if (sector === 'sante-soins' && (category === 'Médecins' || category === 'Dentistes')) return PRACTITIONER_CLAIM
  if (NOT_CLAIMABLE_SECTORS.has(sector) || NOT_CLAIMABLE.has(category)) return null
  return PRO_CLAIM
}
