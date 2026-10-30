import type { MetadataRoute } from 'next'
import { ROBOTS_DISALLOW } from '@/modules/recherche'
import { SITE } from '@/platform/mail'

// Preview et branches de test : jamais indexées.
export const dynamic = 'force-dynamic'

export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV !== 'production') return { rules: { userAgent: '*', disallow: '/' } }
  // Robots d’outils SEO et aspirateurs : beaucoup de pages lues, aucun visiteur en retour (quota CPU Vercel dépassé le 2026-10-29).
  const heavy = ['Bytespider', 'AhrefsBot', 'SemrushBot', 'MJ12bot', 'DotBot', 'PetalBot', 'DataForSeoBot', 'Amazonbot', 'BLEXBot', 'serpstatbot']
  return { rules: [{ userAgent: heavy, disallow: '/' }, { userAgent: '*', allow: '/', disallow: ROBOTS_DISALLOW }], sitemap: `${SITE}/sitemap.xml`, host: SITE }
}
