/**
 * Classement « Partenaire » — règle pure, testée : à pertinence égale (même clé de rang), les fiches au plan payant
 * passent devant, sans jamais dépasser une fiche plus pertinente. L’ordre relatif est conservé sinon (tri stable).
 */
export const PARTNER_TYPES: Record<string, 'places' | 'practitioners' | 'providers' | undefined> = { adresse: 'places', praticien: 'practitioners', prestataire: 'providers' }

export function partnerFirst<T>(sorted: T[], isPartner: (h: T) => boolean, rank: (h: T) => string): T[] {
  const out: T[] = []
  let i = 0
  while (i < sorted.length) {
    let j = i
    const k = rank(sorted[i])
    while (j < sorted.length && rank(sorted[j]) === k) j++
    const block = sorted.slice(i, j)
    out.push(...block.filter(isPartner), ...block.filter((h) => !isPartner(h)))
    i = j
  }
  return out
}
