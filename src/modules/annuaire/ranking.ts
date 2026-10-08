/**
 * Règle de classement DALIL (publique, jamais liée à un paiement) :
 * vérification d’abord, puis complétude de la fiche, puis notoriété et patrimoine.
 * Les avis vérifiés s’ajouteront ici quand ils existeront.
 */
type Rankable = {
  verification?: string | null
  photos?: unknown[] | null
  externalPhotos?: unknown[] | null
  intro?: string | null
  lat?: number | null
  lng?: number | null
  heritage?: string | null
  hours?: unknown[] | null
  phone?: string | null
  website?: string | null
  source?: { notoriety?: number | null } | null
}

const VERIFICATION: Record<string, number> = { labelled: 400, verified: 300, checking: 100, spotted: 0 }

export function scorePlace(p: Rankable): number {
  const notoriety = p.source?.notoriety ?? 0
  const photos = (p.photos?.length ?? 0) + (p.externalPhotos?.length ?? 0)
  return (
    (VERIFICATION[p.verification ?? 'spotted'] ?? 0) +
    Math.min(photos, 6) * 8 +
    ((p.intro?.length ?? 0) >= 200 ? 30 : p.intro ? 10 : 0) +
    (typeof p.lat === 'number' && typeof p.lng === 'number' ? 15 : 0) +
    (p.hours?.length ? 10 : 0) +
    (p.phone || p.website ? 5 : 0) +
    (p.heritage ? 25 : 0) +
    Math.min(notoriety, 60)
  )
}
