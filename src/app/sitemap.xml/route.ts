import { indexXml, sitemapFiles } from '@/modules/recherche'

// Index du plan du site, recalculé à la lecture (cache 1 h) : suit les contenus publiés sans redéploiement.
export const dynamic = 'force-dynamic'

export async function GET() {
  return new Response(indexXml(await sitemapFiles()), {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
  })
}
