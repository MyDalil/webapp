import type { Payload } from 'payload'
import { needsTranslation, STATUS_FIELD, TRANSLATABLE, translatableFields, type TranslationRow } from './core'
import type { TranslateResult } from './translate'

/** Plafond par passe de la tâche quotidienne (TRANSLATE_DAILY_MAX, défaut 50). */
export const dailyTranslateMax = (env: string | undefined = process.env.TRANSLATE_DAILY_MAX) => {
  const n = Number(env)
  return Number.isInteger(n) && n >= 0 ? n : 50
}

const PAGE = 200

export type BackfillReport = {
  plafond: number
  examinees: number
  traduites: { collection: string; id: string; champs: number }[]
  arret?: TranslateResult['arret'] | 'plafond-de-la-passe' | 'temps-ecoule'
}

type Translate = (payload: Payload, collection: string, id: string | number) => Promise<TranslateResult>

/**
 * Rattrapage quotidien « traductions manquantes » : traduit au plus `max` fiches PUBLIÉES dont un champ n’a pas de traduction
 * à jour (empreinte sourceHash absente ou périmée), collection par collection, les plus récemment modifiées d’abord.
 * S’arrête net au plafond de la passe, au budget de temps (la tâche quotidienne a 300 s pour tout), au plafond mensuel de l’IA ou à un échec de l’IA. Rejouable : rien n’est retraduit deux fois.
 */
export async function translateMissing(payload: Payload, opts: { max?: number; translate?: Translate; budgetMs?: number; now?: () => number } = {}): Promise<BackfillReport> {
  const max = opts.max ?? dailyTranslateMax()
  const translate: Translate = opts.translate ?? (async (p, c, id) => (await import('./translate')).translateDoc(p, c, id))
  const out: BackfillReport = { plafond: max, examinees: 0, traduites: [] }
  if (max <= 0) return out
  let tentees = 0
  const now = opts.now ?? Date.now
  const deadline = now() + (opts.budgetMs ?? 90_000)
  for (const collection of Object.keys(TRANSLATABLE)) {
    const fields = translatableFields(collection)
    if (!fields.length) continue
    for (let page = 1; ; page++) {
      const res = await payload.find({
        // Collection choisie à l’exécution parmi les collections traduisibles.
        collection: collection as 'places',
        where: { [STATUS_FIELD[collection] ?? 'status']: { equals: 'published' } },
        select: Object.fromEntries([...fields, 'slug', 'category'].map((f) => [f, true])),
        sort: '-updatedAt',
        limit: PAGE,
        page,
        depth: 0,
        overrideAccess: true,
      })
      const docs = res.docs as unknown as Record<string, unknown>[]
      if (!docs.length) break
      out.examinees += docs.length
      const { docs: rows } = await payload.find({
        collection: 'translations',
        where: { and: [{ collection: { equals: collection } }, { docId: { in: docs.map((d) => String(d.id)) } }] },
        limit: docs.length * fields.length * 2 + 10,
        depth: 0,
        overrideAccess: true,
        pagination: false,
      })
      for (const doc of docs) {
        if (!needsTranslation(doc, collection, rows as TranslationRow[])) continue
        if (tentees >= max) {
          out.arret = 'plafond-de-la-passe'
          return out
        }
        if (now() >= deadline) {
          out.arret = 'temps-ecoule'
          return out
        }
        tentees++
        const r = await translate(payload, collection, doc.id as number)
        if (r.traduits.length) out.traduites.push({ collection, id: String(doc.id), champs: r.traduits.length })
        if (r.arret) {
          out.arret = r.arret
          return out
        }
      }
      if (!res.hasNextPage) break
    }
  }
  return out
}
