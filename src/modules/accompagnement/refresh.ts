import { revalidateLangs } from '@/platform/revalidate'

/** Après un changement de réglage ou de pack : pages recalculées (guides, Démarches, CCR). */
export const refreshPages = () => {
  try {
    revalidateLangs('/', 'layout')
  } catch {
    // Hors requête Next (migration, script) : rien à recalculer.
  }
}
