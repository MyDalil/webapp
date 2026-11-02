import { sitemapUrls, urlsetXml } from '@/modules/recherche'
import { recordError } from '@/platform/monitoring/errors'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const file = (await params).file.replace(/\.xml$/, '')
  let urls
  try {
    urls = await sitemapUrls(file)
  } catch (e) {
    await recordError(e, { route: `/sitemaps/${file}.xml`, routeType: 'sitemap' })
    return new Response('Plan du site momentanément indisponible', { status: 503, headers: { 'retry-after': '3600', 'cache-control': 'no-store' } })
  }
  if (!urls) return new Response('Not found', { status: 404 })
  return new Response(urlsetXml(urls), {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400, stale-if-error=604800' },
  })
}
