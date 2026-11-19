import { suggest } from '@/modules/recherche'
import { guard } from '@/platform/security/rateLimit'
import { WILAYAS } from '@/platform/referentiel/catalog'

/** Propositions pendant la frappe (barre de l’accueil) : catégories, puis contenus. */
export async function GET(req: Request) {
  const limited = await guard('suggestions', 240, 600)
  if (limited) return limited
  const params = new URL(req.url).searchParams
  const q = params.get('q') ?? ''
  // Wilaya de l’en-tête : code connu seulement (69 variantes au plus dans le cache du CDN).
  const w = params.get('w')
  const prefer = w && WILAYAS.some((x) => String(x.code) === w) ? w : null
  const found = await suggest(q, prefer)
  const items = found.items.map(({ type, url, title, subtitle, badge, slot }: { type: string; url: string; title: string; subtitle?: string | null; badge?: string | null; slot?: string }) => ({ type, url, title, subtitle, badge, slot }))
  // Mêmes propositions pour tous : servies par le CDN 5 min (une frappe déjà vue ne coûte ni fonction ni base).
  return Response.json({ items, place: found.place }, { headers: { 'cache-control': 'public, s-maxage=300, stale-while-revalidate=600' } })
}
