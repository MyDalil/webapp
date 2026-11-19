import type { MetadataRoute } from 'next'
import { ROBOTS_DISALLOW } from '@/modules/recherche'
import { SITE } from '@/platform/site'

// Preview et branches de test : jamais indexées.
export const dynamic = 'force-dynamic'

// Robots d’outils SEO et aspirateurs : beaucoup de pages lues, aucun visiteur en retour (quota CPU Vercel dépassé le 2026-10-29).
const HEAVY = ['Bytespider', 'AhrefsBot', 'SemrushBot', 'MJ12bot', 'DotBot', 'PetalBot', 'DataForSeoBot', 'Amazonbot', 'BLEXBot', 'serpstatbot']

// Moteurs et assistants IA autorisés nommément. Un robot nommé ne lit que son propre groupe : mêmes exclusions que « * ».
const AI_AND_SEARCH = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'Bingbot',
]

export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV !== 'production') return { rules: { userAgent: '*', disallow: '/' } }
  return {
    rules: [
      { userAgent: HEAVY, disallow: '/' },
      { userAgent: AI_AND_SEARCH, allow: '/', disallow: ROBOTS_DISALLOW },
      { userAgent: '*', allow: '/', disallow: ROBOTS_DISALLOW },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  }
}
