import { revalidateTag } from 'next/cache'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

/**
 * Lectures publiques des FAQ et des moments mises en cache par étiquette (`faqs`, `moments`).
 * Une modification ou une suppression vide l’étiquette : la page suivante relit la base.
 * Hors contexte Next (migration, script) : rien à vider, aucune erreur.
 */
const clear = (tag: string) => {
  try {
    revalidateTag(tag, { expire: 0 })
  } catch {
    /* hors contexte Next */
  }
}

export const clearTagAfterChange = (tag: string): CollectionAfterChangeHook => ({ doc }) => {
  clear(tag)
  return doc
}
export const clearTagAfterDelete = (tag: string): CollectionAfterDeleteHook => ({ doc }) => {
  clear(tag)
  return doc
}
