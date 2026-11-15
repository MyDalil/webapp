export type SiteRedirect = {
  source: string
  destination: string
  permanent: true
  has?: { type: 'host'; value: string }[]
}

const aliases = [
  ['/login', '/connexion'],
  ['/signin', '/connexion'],
  ['/inscription', '/connexion/particulier?tab=signup'],
  ['/signup', '/connexion/particulier?tab=signup'],
  ['/mot-de-passe-oublie', '/connexion'],
  ['/compte', '/mon-compte'],
  ['/professionnels/espace', '/espace-pro'],
] as const

const localizedAliases: SiteRedirect[] = aliases.flatMap(([source, destination]) => [
  { source, destination, permanent: true },
  ...(['en', 'ar'] as const).map((lang) => ({
    source: `/${lang}${source}`,
    destination: `/${lang}${destination}`,
    permanent: true as const,
  })),
])

export const SITE_REDIRECTS: SiteRedirect[] = [
  {
    source: '/:path*',
    has: [{ type: 'host', value: 'mydalil.vercel.app' }],
    destination: 'https://www.mydalil.com/:path*',
    permanent: true,
  },
  { source: '/fr', destination: '/', permanent: true },
  { source: '/fr/:path*', destination: '/:path*', permanent: true },
  { source: '/test', destination: '/mon-compte', permanent: true },
  { source: '/en/test', destination: '/en/mon-compte', permanent: true },
  { source: '/ar/test', destination: '/ar/mon-compte', permanent: true },
  ...localizedAliases,
]
