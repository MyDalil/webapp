import type { CollectionAfterChangeHook, Payload } from 'payload'
import { after } from 'next/server'
import { translatableFields } from './core'

/**
 * Traduction automatique à la publication (hook afterChange posé par chaque module sur sa collection).
 * Tâche légère lancée après la réponse (`after` de next/server) ; hors requête Next (CLI, scripts), lancée sans attendre.
 * Garde-fous : IA configurée, plafond mensuel (vérifié par translateDoc), jamais pendant un import en masse.
 * Pas de `server-only` ici : la CLI Payload charge les collections.
 */
export function translateLater(payload: Payload, collection: string, id: string | number) {
  if (!process.env.ANTHROPIC_API_KEY || !translatableFields(collection).length) return
  const run = async () => {
    try {
      const { translateDoc } = await import('./translate')
      await translateDoc(payload, collection, id)
    } catch (e) {
      payload.logger?.warn?.(`Traduction automatique ${collection}/${id} non faite : ${(e as Error).message.slice(0, 160)}`)
    }
  }
  try {
    after(run)
  } catch {
    void run()
  }
}

/**
 * Hook : à la publication (ou à la modification d’un texte d’une fiche publiée), traduire.
 * `status` : nom du champ d’état (`_status` pour les collections à versions, `status` sinon).
 */
export const translateOnPublish =
  (status: '_status' | 'status' = '_status'): CollectionAfterChangeHook =>
  ({ collection, doc, previousDoc, req }) => {
    if (req.context?.skipRevalidate || req.context?.skipTranslate) return doc
    if (doc?.[status] !== 'published') return doc
    const fields = translatableFields(collection.slug)
    const changed = previousDoc?.[status] !== 'published' || fields.some((f) => (doc[f] ?? null) !== (previousDoc?.[f] ?? null))
    if (changed) translateLater(req.payload, collection.slug, doc.id)
    return doc
  }
