import { llmsText } from '@/platform/shell/llms'
import { SITE } from '@/platform/site'

// Calculé au build, rafraîchi une fois par jour (contenu tiré du menu et du référentiel).
export const dynamic = 'force-static'
export const revalidate = 2592000 // 30 jours : une fiche modifiée est rafraîchie à la demande (offre gratuite Vercel)

export function GET() {
  return new Response(llmsText(SITE), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400' },
  })
}
