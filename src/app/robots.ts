import type { MetadataRoute } from 'next'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://mydalil.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/recherche', '/en/recherche', '/ar/recherche'] }],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  }
}
