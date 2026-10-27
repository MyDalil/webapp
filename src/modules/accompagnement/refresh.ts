import { revalidatePath } from 'next/cache'

/** Après un changement de réglage ou de pack : pages recalculées (guides, Démarches, CCR). */
export const refreshPages = () => {
  try {
    revalidatePath('/', 'layout')
  } catch {
    // Hors requête Next (migration, script) : rien à recalculer.
  }
}
