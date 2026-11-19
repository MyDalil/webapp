import type { Payload } from 'payload'
import { revalidateTag, unstable_cache } from 'next/cache'

/**
 * FAQ locale : collection `faqs`, une question par ligne, rattachée au chemin de la page (`/services`, `/annuaire/…`).
 * Rien de publié pour ce chemin → aucun bloc ni balisage.
 * Lecture mise en cache (étiquette `faqs`), invalidée par `revalidateEditorial('faqs')` dans le hook afterChange de la collection.
 * Pas de `server-only` ni d’import statique de Payload : le hook de la collection (chargé aussi par la CLI) importe ce fichier.
 */
export type Faq = { id: number | string; question: string; answer: string; order?: number | null }

/** Étiquettes de cache des contenus éditoriaux. */
export const EDITORIAL_TAG = { faqs: 'faqs', moments: 'moments' } as const
export type EditorialKind = keyof typeof EDITORIAL_TAG
/** Filet de sécurité : même sans invalidation, le cache se renouvelle au plus tard après une heure. */
export const EDITORIAL_REVALIDATE = 3600

/**
 * À appeler après tout enregistrement ou suppression dans `faqs` ou `moments` (hooks afterChange / afterDelete).
 * Expiration immédiate : la prochaine visite relit la base. Hors contexte Next (CLI, migrations) : sans effet.
 */
export function revalidateEditorial(kind: EditorialKind) {
  try {
    revalidateTag(EDITORIAL_TAG[kind], { expire: 0 })
  } catch {
    // hors requête Next : aucun cache à invalider
  }
}

export const editorialPayload = async (): Promise<Payload> => {
  const [{ getPayload }, { default: config }] = await Promise.all([import('payload'), import('@payload-config')])
  return getPayload({ config })
}

/** Chemin sans langue ni paramètres ni barre finale : `/en/services/?x=1` → `/services`. */
export const faqScope = (path: string) => (path.split(/[?#]/)[0].replace(/^\/(fr|en|ar)(?=\/|$)/, '').replace(/\/+$/, '') || '/')

async function loadFaqs(scope: string, lang: string): Promise<Faq[]> {
  const p = await editorialPayload()
  const { docs } = await p.find({
    collection: 'faqs',
    where: { and: [{ scope: { equals: scope } }, { lang: { equals: lang as 'fr' } }, { published: { equals: true } }] },
    sort: 'order',
    limit: 30,
    depth: 0,
    overrideAccess: true,
  })
  return docs.filter((f) => f.question?.trim() && f.answer?.trim()).map((f) => ({ id: f.id, question: f.question, answer: f.answer, order: f.order }))
}

const cachedFaqs = unstable_cache(loadFaqs, ['contenus-faqs'], { tags: [EDITORIAL_TAG.faqs], revalidate: EDITORIAL_REVALIDATE })

export async function faqsFor(path: string, lang = 'fr', load: (scope: string, lang: string) => Promise<Faq[]> = cachedFaqs): Promise<Faq[]> {
  try {
    return await load(faqScope(path), lang)
  } catch {
    // Une panne ne casse jamais la page : le bloc est simplement absent (une erreur n’est jamais mise en cache).
    return []
  }
}

/** Balisage schema.org FAQPage (seulement s’il y a des questions). */
export function faqJsonLd(faqs: Faq[]): string | null {
  if (!faqs.length) return null
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.question.trim(), acceptedAnswer: { '@type': 'Answer', text: f.answer.trim() } })),
  }).replace(/</g, '\\u003c')
}
