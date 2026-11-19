import type { Payload } from 'payload'
import { overlay, translatableFields } from './core'

/**
 * Contenus traduits : superpose les traductions de la collection `translations` (lot C1) sur des fiches.
 * Lecture groupée : une seule requête pour toute une page de fiches. Le français est renvoyé tel quel.
 * En cas d’erreur (table absente, base indisponible), la fiche reste en français : jamais de page cassée.
 * Pas de `server-only` : utilisable depuis les fichiers de requêtes des modules comme depuis les hooks.
 */
type Lang = 'fr' | 'en' | 'ar'
type Doc = { id?: string | number | null }

const getPayload = async (): Promise<Payload> => {
  const [{ getPayload: gp }, { default: config }] = await Promise.all([import('payload'), import('@payload-config')])
  return gp({ config })
}

export async function localizeMany<T extends Doc>(docs: T[], collection: string, lang: Lang | undefined, payload?: Payload): Promise<T[]> {
  if (!lang || lang === 'fr' || !docs.length || !translatableFields(collection).length) return docs
  const ids = [...new Set(docs.flatMap((d) => (d?.id == null ? [] : [String(d.id)])))]
  if (!ids.length) return docs
  try {
    const p = payload ?? (await getPayload())
    const { docs: rows } = await p.find({
      collection: 'translations',
      where: { and: [{ collection: { equals: collection } }, { lang: { equals: lang } }, { docId: { in: ids } }] },
      limit: ids.length * translatableFields(collection).length + 10,
      depth: 0,
      overrideAccess: true,
      pagination: false,
    })
    return overlay(docs, collection, lang, rows)
  } catch {
    return docs
  }
}

/** Une fiche dans la langue demandée (traductions à jour seulement ; sinon le français). */
export async function localize<T extends Doc | null>(doc: T, collection: string, lang: Lang | undefined, payload?: Payload): Promise<T> {
  if (!doc) return doc
  return (await localizeMany([doc as Doc], collection, lang, payload))[0] as T
}
