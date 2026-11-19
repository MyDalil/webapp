/**
 * Réécritures du site (lues par next.config.ts) : le français est servi à la racine (/x → /fr/x en interne),
 * sauf pour les chemins techniques ci-dessous, servis tels quels. Fichier sans dépendance : testé seul.
 */
export type SiteRewrite = { source: string; destination: string; has?: { type: 'host'; value: string }[] }

/** Premiers segments jamais réécrits vers /fr : langues, socle, fichiers techniques (PWA, robots des IA, OAuth). */
export const UNLOCALIZED_SEGMENTS = [
  'fr',
  'en',
  'ar',
  'api',
  'admin',
  '_next',
  'sitemaps',
  '.well-known',
  'oauth',
  'icons',
  'manifest.webmanifest',
  'sw.js',
  'llms.txt',
] as const

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Tout chemin dont le premier segment n’est pas dans la liste (segment entier : /frites reste réécrit). */
export const LOCALE_REWRITE_SOURCE = `/:path((?!(?:${UNLOCALIZED_SEGMENTS.map(escapeRegExp).join('|')})(?:/|$)).*)`

/** Serveur MCP public sur son propre domaine (à ajouter dans Vercel) : / et /admin pointent vers /api/mcp. */
export const MCP_HOST = 'mcp.mydalil.com'

export const SITE_REWRITES: { beforeFiles: SiteRewrite[]; afterFiles: SiteRewrite[]; fallback: SiteRewrite[] } = {
  // Avant les pages : sur mcp.mydalil.com, / et /admin ne doivent servir ni l’accueil du site ni Payload.
  beforeFiles: [
    { source: '/', has: [{ type: 'host', value: MCP_HOST }], destination: '/api/mcp' },
    { source: '/admin', has: [{ type: 'host', value: MCP_HOST }], destination: '/api/mcp/admin' },
  ],
  afterFiles: [
    { source: '/', destination: '/fr' },
    // Lien court d’une page pro : /@slug → /pro/slug (français ; /en/@slug et /ar/@slug dans leur langue).
    { source: '/@:slug([a-z0-9-]+)', destination: '/fr/pro/:slug' },
    { source: '/:lang(en|ar)/@:slug([a-z0-9-]+)', destination: '/:lang/pro/:slug' },
    { source: LOCALE_REWRITE_SOURCE, destination: '/fr/:path' },
  ],
  fallback: [],
}
