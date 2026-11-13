import { indexXml, sitemapFiles } from '@/modules/recherche'
import { recordError } from '@/platform/monitoring/errors'

// Index du plan du site, recalculé à la lecture (cache 1 h) : suit les contenus publiés sans redéploiement.
// Base indisponible : 503 (jamais un index amputé), les moteurs gardent le dernier index valide.
export const dynamic = 'force-dynamic'

export async function GET() {
  let files
  try {
    files = await sitemapFiles()
  } catch (e) {
    await recordError(e, { route: '/sitemap.xml', routeType: 'sitemap' })
    return new Response('Plan du site momentanément indisponible', { status: 503, headers: { 'retry-after': '3600', 'cache-control': 'no-store' } })
  }
  return new Response(indexXml(files), {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400, stale-if-error=604800' },
  })
}
