import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, GlobalAfterChangeHook } from 'payload'

/**
 * Invalide le cache du site public à chaque publication.
 * Pas de reconstruction quotidienne : la page se met à jour à la validation.
 * Silencieux hors contexte Next (scripts de seed, migrations).
 */
async function purge() {
  try {
    const { revalidatePath } = await import('next/cache')
    revalidatePath('/', 'layout')
  } catch {
    /* hors runtime Next */
  }
}

export const revalidateAfterChange: CollectionAfterChangeHook = async ({ doc, req }) => {
  if (req.context?.disableRevalidate) return doc
  if (!('_status' in doc) || doc._status === 'published') await purge()
  return doc
}

export const revalidateAfterDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
  if (!req.context?.disableRevalidate) await purge()
  return doc
}

export const revalidateGlobal: GlobalAfterChangeHook = async ({ doc, req }) => {
  if (!req.context?.disableRevalidate) await purge()
  return doc
}
