import { revalidateTag } from 'next/cache'
import { revalidateLangs } from '@/platform/revalidate'
import { SPONSOR_PAGES, SPONSOR_TARGETS, type SponsorTarget } from './sponsoringCore'

/** Étiquette du cache des sponsorisations actives (`sponsoring.ts`). */
export const SPONSORSHIPS_TAG = 'sponsorships'

/**
 * Une sponsorisation change : vide le cache des actives et rafraîchit les listes et la recherche concernées (3 langues).
 * Sans `server-only` : appelé par les hooks de la collection (chargée aussi par la CLI Payload).
 * Hors contexte Next (migration, script, tâche) : rien à rafraîchir, aucune erreur.
 */
export function refreshSponsorships(targets: (SponsorTarget | null | undefined)[] = []) {
  try {
    revalidateTag(SPONSORSHIPS_TAG, { expire: 0 })
  } catch {
    return
  }
  const known = targets.filter((t): t is SponsorTarget => !!t && SPONSOR_TARGETS.includes(t))
  const paths = new Set((known.length ? known : SPONSOR_TARGETS).flatMap((t) => SPONSOR_PAGES[t]))
  for (const path of paths) {
    try {
      revalidateLangs(path, path === '/' ? 'page' : 'layout')
    } catch {
      /* hors contexte Next */
    }
  }
}
