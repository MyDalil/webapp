import { sitemapUrls, urlsetXml } from '@/modules/recherche'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const urls = await sitemapUrls((await params).file.replace(/\.xml$/, ''))
  if (!urls) return new Response('Not found', { status: 404 })
  return new Response(urlsetXml(urls), {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
  })
}
