import 'server-only'
import { countPublishedPlaces, getPlaceCounts, getPlaceSitemap, wilayaSlug } from '@/modules/annuaire'
import { CATEGORIES as CLASSIFIED_CATEGORIES, getClassifiedSitemap } from '@/modules/annonces'
import { ROUTES } from '@/modules/contenus'
import { getPractitionerSitemap } from '@/modules/sante'
import { CATEGORIES as SERVICE_CATEGORIES, getProviderSitemap } from '@/modules/services'
import { SITE } from '@/platform/mail'
import { SECTORS } from '@/platform/referentiel/catalog'

/**
 * Plan du site dynamique : uniquement les pages publiques et les contenus publiés (annonces : en ligne et non expirées).
 * Pages privées, de compte ou de formulaire interne exclues. Mis à jour à chaque lecture (cache 1 h), sans redéploiement.
 */
export type SitemapUrl = { loc: string; lastmod?: string }

/** Tranche d’adresses par fichier (limite des moteurs : 50 000 adresses). */
export const PLACES_PER_FILE = 40_000

/** Pages du prototype à ne pas indexer : privées, outils internes, fiches servies depuis Neon. */
const EXCLUDED = new Set(['/recherche', '/professionnels/espace', '/feedback'])

/** Pages dédiées hors du contenu du prototype. */
const DEDICATED = ['/annonces', '/services', '/praticiens', '/que-faire-ce-week-end']

const url = (path: string, lastmod?: string): SitemapUrl => ({ loc: `${SITE}${path === '/' ? '' : path}`, lastmod })

/** Noms des fichiers du plan : pages, puis adresses par tranches. */
export async function sitemapFiles(): Promise<string[]> {
  const places = await countPublishedPlaces()
  const chunks = Math.max(1, Math.ceil(places / PLACES_PER_FILE))
  return ['pages', 'professionnels', 'annonces', ...Array.from({ length: chunks }, (_, i) => `adresses-${i}`)]
}

/** Adresses d’un fichier du plan, ou null si le nom est inconnu. */
export async function sitemapUrls(file: string): Promise<SitemapUrl[] | null> {
  if (file === 'pages') {
    const counts = await getPlaceCounts()
    const content = ROUTES.filter((r) => !EXCLUDED.has(r) && !r.startsWith('/adresses/') && !r.startsWith('/annuaire/'))
    const sectors = SECTORS.map((s) => `/annuaire/${s.slug}`)
    const cities = Object.keys(counts.wilaya)
      .filter((name) => counts.wilaya[name] > 0)
      .map((name) => `/villes/${wilayaSlug(name)}`)
    const services = SERVICE_CATEGORIES.map((c) => `/services/${c.value}`)
    const classifieds = CLASSIFIED_CATEGORIES.map((c) => `/annonces/${c.value}`)
    return [...new Set([...content, ...DEDICATED, ...sectors, ...cities, ...services, ...classifieds])].map((p) => url(p))
  }
  if (file === 'professionnels') {
    const [practitioners, providers] = await Promise.all([getPractitionerSitemap().catch(() => []), getProviderSitemap().catch(() => [])])
    return [...practitioners.map((p) => url(`/praticiens/${p.slug}`, p.updatedAt)), ...providers.map((p) => url(`/prestataires/${p.slug}`, p.updatedAt))]
  }
  if (file === 'annonces') {
    const list = await getClassifiedSitemap().catch(() => [])
    return list.map((a) => url(`/annonces/${a.category}/${a.slug}`, a.updatedAt))
  }
  const m = /^adresses-(\d+)$/.exec(file)
  if (m) {
    const list = await getPlaceSitemap(Number(m[1]) * PLACES_PER_FILE, PLACES_PER_FILE)
    return list.map((p) => url(`/adresses/${p.slug}`, p.updatedAt))
  }
  return null
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export const urlsetXml = (urls: SitemapUrl[]) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `<url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`)
    .join('\n')}\n</urlset>\n`

export const indexXml = (files: string[]) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${files
    .map((f) => `<sitemap><loc>${esc(`${SITE}/sitemaps/${f}.xml`)}</loc></sitemap>`)
    .join('\n')}\n</sitemapindex>\n`

/** Robots : tout bloqué hors production (preview, branches) ; en production, espaces privés et outils exclus. */
export const ROBOTS_DISALLOW = ['/admin', '/api/', '/mon-compte', '/espace', '/espace-pro', '/missions', '/connexion', '/onboarding', '/test', '/newsletter/', '/annonces/deposer', '/annonces/messagerie', '/recherche', '/professionnels/espace']
