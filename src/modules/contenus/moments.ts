import { unstable_cache } from 'next/cache'
import { EDITORIAL_REVALIDATE, EDITORIAL_TAG, editorialPayload } from './faqs'

/**
 * Pages saisonnières (Ramadan, Aïd, rentrée, été…) : collection `moments` (lot C1), saisies par l’équipe dans /admin.
 * Seuls les moments publiés et en cours existent : aucun moment → aucune page, aucune ligne du plan du site.
 * Lecture mise en cache (étiquette `moments`, invalidée par `revalidateEditorial('moments')`) ; « en cours » est calculé après le cache.
 */
export type Moment = {
  id: number | string
  slug: string
  title: string
  summary?: string | null
  body?: unknown
  startsAt?: string | null
  endsAt?: string | null
  links?: { label?: string | null; url?: string | null }[] | null
  lang?: string | null
  published?: boolean | null
  updatedAt?: string
}

/** En cours : début passé (ou absent), fin à venir (ou absente). */
export function isCurrentMoment(m: Pick<Moment, 'published' | 'startsAt' | 'endsAt'>, now = new Date()): boolean {
  if (!m.published) return false
  const t = now.getTime()
  if (m.startsAt && Date.parse(m.startsAt) > t) return false
  if (m.endsAt && Date.parse(m.endsAt) <= t) return false
  return true
}

/** Moments publiés (toutes langues), avant le filtre de dates. */
async function loadPublished(): Promise<Moment[]> {
  const p = await editorialPayload()
  const { docs } = await p.find({ collection: 'moments', where: { published: { equals: true } }, sort: 'startsAt', limit: 200, depth: 0, overrideAccess: true })
  return docs
}

const cachedPublished = unstable_cache(loadPublished, ['contenus-moments'], { tags: [EDITORIAL_TAG.moments], revalidate: EDITORIAL_REVALIDATE })

/** Moments publiés et en cours (toutes langues, ou une seule). */
export async function currentMoments(lang?: string, load: () => Promise<Moment[]> = cachedPublished, now = new Date()): Promise<Moment[]> {
  return (await load()).filter((m) => m.slug && (!lang || m.lang === lang) && isCurrentMoment(m, now))
}

/** Un moment publié et en cours, sinon null (404). */
export async function momentBySlug(slug: string, lang?: string, load: () => Promise<Moment[]> = cachedPublished, now = new Date()): Promise<Moment | null> {
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return null
  const list = (await load()).filter((m) => m.slug === slug && isCurrentMoment(m, now))
  return list.find((m) => m.lang === lang) ?? list.find((m) => !m.lang || m.lang === 'fr') ?? list[0] ?? null
}
