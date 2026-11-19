import { paymentReturnHtml } from '@/modules/pros'
import { SITE } from '@/platform/site'

/** Retour du client après paiement : page simple, non indexée. L’activation suit le webhook signé, jamais ce retour. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams
  return new Response(paymentReturnHtml({ lang: q.get('lang'), etat: q.get('etat') }, SITE), {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' },
  })
}
