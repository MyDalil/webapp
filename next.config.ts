import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'
import { SITE_REDIRECTS } from './src/platform/routes'
import { SITE_REWRITES } from './src/platform/rewrites'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

/** Site public (maquette DALIL + contenu du prototype) ; /admin et /api servis par Payload / Neon. */
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Listes publiques calculées à la demande (filtres dans l’adresse), identiques pour tous les visiteurs :
        // gardées 2 minutes par le CDN de Vercel, puis rafraîchies en arrière-plan. Cent visites de la même liste
        // = un seul calcul serveur. Jamais les pages de compte, de fiche d’annonce ou de messagerie.
        source: '/:lang(en|ar)?/:list(services|praticiens|annonces)/:cat(bricolage|menage|garde-enfants|cours-particuliers|aide-domicile|demenagement|immobilier|emploi|vehicules|objets)?',
        headers: [{ key: 'Vercel-CDN-Cache-Control', value: 'public, s-maxage=120, stale-while-revalidate=600' }],
      },
      {
        source: '/((?!admin|api).*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), geolocation=(self), microphone=(self), payment=(), usb=(), interest-cohort=()' },
        ],
      },
      {
        // Service worker : portée = tout le site ; relu à chaque visite pour qu’une nouvelle version s’installe vite.
        source: '/sw.js',
        headers: [
          { key: 'Service-Worker-Allowed', value: '/' },
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
      // Visiteur connecté (cookie de session) : le service worker ne garde jamais la page en cache hors ligne.
      ...['payload-token', 'dalil_sid'].map((key) => ({
        source: '/((?!api|_next).*)',
        has: [{ type: 'cookie' as const, key }],
        headers: [{ key: 'X-Dalil-Session', value: '1' }],
      })),
      {
        // Partout, /admin et /api compris : HTTPS imposé, pas d’intégration dans un autre site, pas de plugin.
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'" },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ]
  },
  // Langues : le français est servi à la racine (/x → /fr/x en interne), l’anglais et l’arabe sous /en et /ar.
  async redirects() {
    return SITE_REDIRECTS
  },
  // Chemins techniques exclus (PWA, llms.txt, OAuth…) et domaine mcp.mydalil.com : src/platform/rewrites.ts (testé).
  async rewrites() {
    return SITE_REWRITES
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }
    return webpackConfig
  },
  turbopack: { root: path.resolve(dirname) },
  // Jeux d’import (osm-selected.json : 12 Mo) lus seulement par les migrations au build : hors des fonctions serveur.
  outputFileTracingExcludes: { '*': ['./src/modules/annuaire/data/**/*'] },
  // Le moteur d’agents lit le dossier company/ (méthode ICM) à l’exécution : seulement dans les fonctions qui l’appellent
  // (routes des agents ; bot Telegram → activateRole ; hook des tâches via l’API Payload et /admin ; vue Mémoire de /admin),
  // plus dans toutes les pages du site.
  outputFileTracingIncludes: Object.fromEntries(
    ['/api/agents/**', '/api/taches', '/api/telegram', '/api/\\[...slug\\]', '/admin/**'].map((route) => [route, ['./company/**/*']]),
  ),
  // 404 du site avec son en-tête et son pied de page (le site et /admin ont chacun leur racine).
  experimental: { globalNotFound: true },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
