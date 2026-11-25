import type { MetadataRoute } from 'next'
import { ROBOTS_DISALLOW } from '@/modules/recherche'
import { SITE } from '@/platform/site'

// Preview et branches de test : jamais indexées.
export const dynamic = 'force-dynamic'

// Robots d’outils SEO et aspirateurs : beaucoup de pages lues, aucun visiteur en retour (quota CPU Vercel dépassé le 2026-10-29).
// Offre gratuite Vercel (25 nov. 2026) : les robots d’entraînement des IA (lecture en masse, aucun visiteur) sont aussi exclus ;
// les robots de recherche et les lectures déclenchées par un utilisateur (ChatGPT, Claude, Perplexity) restent autorisés.
const HEAVY = ['Bytespider', 'AhrefsBot', 'SemrushBot', 'MJ12bot', 'DotBot', 'PetalBot', 'DataForSeoBot', 'Amazonbot', 'BLEXBot', 'serpstatbot', 'GPTBot', 'ClaudeBot', 'CCBot', 'Google-Extended', 'Applebot-Extended', 'meta-externalagent', 'FacebookBot', 'cohere-ai', 'Diffbot', 'ImagesiftBot', 'Omgilibot', 'YouBot', 'Timpibot']

// Moteurs et assistants IA autorisés nommément. Un robot nommé ne lit que son propre groupe : mêmes exclusions que « * ».
const AI_AND_SEARCH = [
  'OAI-SearchBot',
  'ChatGPT-User',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
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
