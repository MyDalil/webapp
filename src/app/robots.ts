import type { MetadataRoute } from 'next'
import { ROBOTS_DISALLOW } from '@/modules/recherche'
import { SITE } from '@/platform/mail'

// Preview et branches de test : jamais indexées.
export const dynamic = 'force-dynamic'

export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV !== 'production') return { rules: { userAgent: '*', disallow: '/' } }
  return { rules: { userAgent: '*', allow: '/', disallow: ROBOTS_DISALLOW }, sitemap: `${SITE}/sitemap.xml`, host: SITE }
}
