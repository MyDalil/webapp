import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

/** Site public (maquette DALIL + contenu du prototype) ; /admin et /api servis par Payload / Neon. */
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/((?!admin|api).*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ]
  },
  // Langues : le français est servi à la racine (/x → /fr/x en interne), l’anglais et l’arabe sous /en et /ar.
  async redirects() {
    return [
      { source: '/fr', destination: '/', permanent: true },
      { source: '/fr/:path*', destination: '/:path*', permanent: true },
    ]
  },
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [
        { source: '/', destination: '/fr' },
        { source: '/:path((?!(?:fr|en|ar|api|admin|_next|sitemaps)(?:/|$)).*)', destination: '/fr/:path' },
      ],
      fallback: [],
    }
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
  // 404 du site avec son en-tête et son pied de page (le site et /admin ont chacun leur racine).
  experimental: { globalNotFound: true },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
