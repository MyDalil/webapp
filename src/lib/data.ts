import 'server-only'
import { cache } from 'react'
import { getPayload, type Where } from 'payload'
import config from '@payload-config'
import { normalize } from './normalize'
import type { Locale } from '@/i18n/routing'

export const payload = cache(async () => getPayload({ config }))

/** Valeur localisée telle que renvoyée avec locale: 'all'. */
export type L<T = string> = Partial<Record<Locale, T>> | T | null | undefined

export type Picked<T = string> = { value: T | undefined; lang: Locale; fallback: boolean }

/** Choisit la langue demandée, sinon le français ; indique si on est en repli. */
export function pick<T = string>(v: L<T>, locale: Locale): Picked<T> {
  if (v && typeof v === 'object' && !Array.isArray(v) && ('fr' in v || 'en' in v || 'ar' in v) && !('root' in v)) {
    const rec = v as Partial<Record<Locale, T>>
    const own = rec[locale]
    if (own !== undefined && own !== null && own !== '') return { value: own, lang: locale, fallback: false }
    for (const l of ['fr', 'en', 'ar'] as Locale[]) {
      const x = rec[l]
      if (x !== undefined && x !== null && x !== '') return { value: x, lang: l, fallback: l !== locale }
    }
    return { value: undefined, lang: locale, fallback: false }
  }
  return { value: (v ?? undefined) as T | undefined, lang: locale, fallback: false }
}

/** Raccourci : texte seul. */
export const tx = (v: L, locale: Locale) => pick<string>(v, locale).value ?? ''

const pub: Where = { _status: { equals: 'published' } }

export const getSectors = cache(async () => {
  const p = await payload()
  const res = await p.find({ collection: 'sectors', locale: 'all', limit: 100, sort: 'order', depth: 0 })
  return res.docs
})

export const getSector = cache(async (slug: string) => {
  const p = await payload()
  const res = await p.find({ collection: 'sectors', locale: 'all', where: { slug: { equals: slug } }, limit: 1, depth: 1 })
  return res.docs[0] ?? null
})

export const getSpecialties = cache(async (sectorId?: number) => {
  const p = await payload()
  const res = await p.find({
    collection: 'specialties',
    locale: 'all',
    limit: 500,
    sort: 'order',
    depth: 0,
    where: sectorId ? { sector: { equals: sectorId } } : undefined,
  })
  return res.docs
})

export const getWilayas = cache(async () => {
  const p = await payload()
  const res = await p.find({ collection: 'wilayas', locale: 'all', limit: 100, sort: 'code', depth: 0 })
  return res.docs
})

export const countListingsBySector = cache(async () => {
  const p = await payload()
  const res = await p.find({ collection: 'listings', where: pub, limit: 0, depth: 0, pagination: false, select: { sector: true } })
  const map = new Map<number, number>()
  for (const d of res.docs) {
    const id = typeof d.sector === 'object' ? d.sector?.id : d.sector
    if (id) map.set(id, (map.get(id) ?? 0) + 1)
  }
  return map
})

export async function getListings(opts: { sector?: number; specialty?: number; wilaya?: number; page?: number; limit?: number; featured?: boolean }) {
  const p = await payload()
  const and: Where[] = [pub]
  if (opts.sector) and.push({ sector: { equals: opts.sector } })
  if (opts.specialty) and.push({ specialties: { contains: opts.specialty } })
  if (opts.wilaya) and.push({ wilaya: { equals: opts.wilaya } })
  if (opts.featured) and.push({ featured: { equals: true } })
  return p.find({
    collection: 'listings',
    locale: 'all',
    where: { and },
    limit: opts.limit ?? 24,
    page: opts.page ?? 1,
    sort: ['-label', '-featured', 'name'],
    depth: 1,
  })
}

export const getListing = cache(async (slug: string) => {
  const p = await payload()
  const res = await p.find({ collection: 'listings', locale: 'all', where: { and: [pub, { slug: { equals: slug } }] }, limit: 1, depth: 2 })
  return res.docs[0] ?? null
})

export const getGuides = cache(async (theme?: string) => {
  const p = await payload()
  const res = await p.find({
    collection: 'guides',
    locale: 'all',
    where: theme ? { and: [pub, { theme: { equals: theme } }] } : pub,
    limit: 200,
    sort: 'order',
    depth: 1,
  })
  return res.docs
})

export const getGuide = cache(async (slug: string) => {
  const p = await payload()
  const res = await p.find({ collection: 'guides', locale: 'all', where: { and: [pub, { slug: { equals: slug } }] }, limit: 1, depth: 1 })
  return res.docs[0] ?? null
})

export const getArticles = cache(async (limit = 30) => {
  const p = await payload()
  const res = await p.find({ collection: 'articles', locale: 'all', where: pub, limit, sort: '-publishedAt', depth: 1 })
  return res.docs
})

export const getArticle = cache(async (slug: string) => {
  const p = await payload()
  const res = await p.find({ collection: 'articles', locale: 'all', where: { and: [pub, { slug: { equals: slug } }] }, limit: 1, depth: 1 })
  return res.docs[0] ?? null
})

export const getPage = cache(async (slug: string) => {
  const p = await payload()
  const res = await p.find({ collection: 'pages', locale: 'all', where: { and: [pub, { slug: { equals: slug } }] }, limit: 1, depth: 1 })
  return res.docs[0] ?? null
})

export const getHome = cache(async () => {
  const p = await payload()
  return p.findGlobal({ slug: 'home', locale: 'all', depth: 2 })
})

/**
 * Recherche tolérante (accents, diacritiques arabes) sur fiches, guides et actualités.
 * Chaque mot doit apparaître ; on cherche dans la langue courante puis en français.
 */
export async function search(q: string, locale: Locale) {
  const terms = normalize(q).split(' ').filter((t) => t.length > 1).slice(0, 6)
  if (!terms.length) return { listings: [], guides: [], articles: [] }
  const p = await payload()
  const locales: Locale[] = locale === 'fr' ? ['fr'] : [locale, 'fr']
  const where: Where = { and: [pub, ...terms.map((t) => ({ searchText: { like: t } }))] }

  async function run<C extends 'listings' | 'guides' | 'articles'>(collection: C, limit: number) {
    const seen = new Map<number, unknown>()
    for (const l of locales) {
      const r = await p.find({ collection, locale: l, where, limit, depth: 0 })
      for (const d of r.docs as { id: number }[]) seen.set(d.id, true)
    }
    const ids = [...seen.keys()].slice(0, limit)
    if (!ids.length) return []
    const full = await p.find({ collection, locale: 'all', where: { id: { in: ids } }, limit, depth: 1 })
    return full.docs
  }

  const [listings, guides, articles] = await Promise.all([run('listings', 30), run('guides', 12), run('articles', 12)])
  return { listings, guides, articles }
}
