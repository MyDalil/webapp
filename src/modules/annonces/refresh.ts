import { revalidatePath } from 'next/cache'

/** Rafraîchit l’accueil, la rubrique, la catégorie et la page de l’annonce (sans redéploiement). */
export function refreshPages(category?: string | null, slug?: string | null) {
  try {
    revalidatePath('/')
    revalidatePath('/annonces')
    if (category) revalidatePath(`/annonces/${category}`)
    if (category && slug) revalidatePath(`/annonces/${category}/${slug}`)
  } catch {
    // hors contexte Next (migrations, scripts, tâche planifiée) : rien à rafraîchir
  }
}
