import type { MetadataRoute } from 'next'
import { getPayload } from 'payload'
import config from '@payload-config'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://mydalil.com'
const PREFIX = { fr: '', en: '/en', ar: '/ar' } as const

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const p = await getPayload({ config })
  const pub = { _status: { equals: 'published' } } as const
  const [sectors, guides, articles, pages, listings] = await Promise.all([
    p.find({ collection: 'sectors', limit: 200, depth: 0, select: { slug: true, updatedAt: true } }),
    p.find({ collection: 'guides', where: pub, limit: 1000, depth: 0, select: { slug: true, updatedAt: true } }),
    p.find({ collection: 'articles', where: pub, limit: 1000, depth: 0, select: { slug: true, updatedAt: true } }),
    p.find({ collection: 'pages', where: pub, limit: 200, depth: 0, select: { slug: true, updatedAt: true } }),
    p.find({ collection: 'listings', where: pub, limit: 10000, depth: 1, select: { slug: true, updatedAt: true, sector: true } }),
  ])
  const paths: { path: string; lastModified?: string }[] = [
    ...['', '/annuaire', '/guides', '/actualites', '/explorer', '/installation', '/demarches', '/vie-pratique', '/business-emploi', '/proposer', '/professionnels'].map((path) => ({ path })),
    ...sectors.docs.map((d) => ({ path: `/annuaire/${d.slug}`, lastModified: d.updatedAt })),
    ...guides.docs.map((d) => ({ path: `/guides/${d.slug}`, lastModified: d.updatedAt })),
    ...articles.docs.map((d) => ({ path: `/actualites/${d.slug}`, lastModified: d.updatedAt })),
    ...pages.docs.map((d) => ({ path: `/${d.slug}`, lastModified: d.updatedAt })),
    ...listings.docs.map((d) => ({ path: `/annuaire/${typeof d.sector === 'object' ? d.sector?.slug : ''}/${d.slug}`, lastModified: d.updatedAt })),
  ]
  return paths.map(({ path, lastModified }) => ({
    url: `${SITE}${path || '/'}`,
    lastModified,
    alternates: { languages: Object.fromEntries(Object.entries(PREFIX).map(([l, pre]) => [l, `${SITE}${pre}${path}`])) },
  }))
}
