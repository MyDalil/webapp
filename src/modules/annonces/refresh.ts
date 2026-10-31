import { revalidateLangs } from '@/platform/revalidate'

/** Rafraîchit l’accueil, la rubrique, la catégorie et la page de l’annonce (sans redéploiement). */
export function refreshPages(category?: string | null, slug?: string | null) {
  try {
    revalidateLangs('/')
    revalidateLangs('/annonces')
    if (category) revalidateLangs(`/annonces/${category}`)
    if (category && slug) revalidateLangs(`/annonces/${category}/${slug}`)
  } catch {
    // hors contexte Next (migrations, scripts, tâche planifiée) : rien à rafraîchir
  }
}
