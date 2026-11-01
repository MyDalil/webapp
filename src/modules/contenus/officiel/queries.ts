import { payload } from '@/platform/http'
import type { Platform, Procedure, Representation } from '@/payload-types'

/**
 * Lecture publique des démarches officielles, des services en ligne et des postes consulaires (Neon).
 * Base indisponible (build sans base, panne) : listes vides, jamais d’erreur affichée au visiteur.
 */
const safe = async <T>(fn: () => Promise<T>, empty: T): Promise<T> => {
  try {
    return await fn()
  } catch {
    return empty
  }
}
const published = { status: { equals: 'published' } } as const

export const listProcedures = (theme?: string) =>
  safe(async () => (await (await payload()).find({ collection: 'procedures', where: theme ? { and: [published, { theme: { equals: theme } }] } : published, sort: 'title', limit: 2000, depth: 0, overrideAccess: false })).docs as Procedure[], [] as Procedure[])

export const procedureBySlug = (slug: string) =>
  safe(async () => ((await (await payload()).find({ collection: 'procedures', where: { and: [published, { slug: { equals: slug } }] }, limit: 1, depth: 0, overrideAccess: false })).docs[0] as Procedure | undefined) ?? null, null as Procedure | null)

export const listPlatforms = () =>
  safe(async () => (await (await payload()).find({ collection: 'platforms', where: published, sort: 'order', limit: 500, depth: 0, overrideAccess: false })).docs as Platform[], [] as Platform[])

export const listRepresentations = () =>
  safe(async () => (await (await payload()).find({ collection: 'representations', where: published, sort: 'country', limit: 2000, depth: 0, overrideAccess: false })).docs as Representation[], [] as Representation[])

/** Nombre de démarches par thème (pour masquer un thème vide, jamais affiché comme compteur). */
export async function themesWithContent() {
  const all = await listProcedures()
  return new Set(all.map((p) => p.theme))
}
