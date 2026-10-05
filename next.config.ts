import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

/**
 * Le site public est la copie 1:1 du prototype DALIL (public/).
 * Chaque page vit dans public/<chemin>/index.html, avec son flux RSC public/<chemin>.rsc
 * utilisé par la navigation côté client. /admin et /api restent servis par Payload / Neon.
 */
const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/', destination: '/index.html' },
        { source: '/.rsc', destination: '/index.rsc' },
      ],
      afterFiles: [],
      fallback: [{ source: '/:path((?!admin|api|_next).*)', destination: '/:path/index.html' }],
    }
  },
  async headers() {
    return [
      {
        source: '/:path*.rsc',
        headers: [
          { key: 'Content-Type', value: 'text/x-component; charset=utf-8' },
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Vary', value: 'RSC, Accept' },
        ],
      },
      {
        source: '/(\\.rsc|index\\.rsc)',
        headers: [{ key: 'Content-Type', value: 'text/x-component; charset=utf-8' }],
      },
      {
        source: '/assets/:file*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
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
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }
    return webpackConfig
  },
  turbopack: { root: path.resolve(dirname) },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
