import { withPayload } from '@payloadcms/next/withPayload'
import createNextIntlPlugin from 'next-intl/plugin'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

// Anciennes URL du prototype → nouvelles pages
const LEGACY: [string, string][] = [
  ['/espace', '/'],
  ['/onboarding', '/'],
  ['/rejoindre', '/actualites'],
  ['/boutique', '/professionnels'],
  ['/diagnostic', '/installation'],
  ['/professionnels/rejoindre', '/professionnels'],
  ['/professionnels/espace', '/professionnels'],
  ['/conditions', '/conditions-utilisation'],
  ['/annuaire/administrations-services-publics', '/annuaire/administrations-services-publics'],
]

const nextConfig: NextConfig = {
  async redirects() {
    return LEGACY.filter(([a, b]) => a !== b).map(([source, destination]) => ({ source, destination, permanent: true }))
  },
  async headers() {
    return [
      {
        source: '/((?!admin|api).*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
    remotePatterns: [{ protocol: 'https', hostname: '*.public.blob.vercel-storage.com' }],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(withNextIntl(nextConfig), { devBundleServerPackages: false })
