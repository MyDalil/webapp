import { suggest } from '@/modules/recherche'
import { json } from '@/platform/http'
import { guard } from '@/platform/security/rateLimit'

/** Propositions pendant la frappe (barre de l’accueil) : catégories, puis contenus. */
export async function GET(req: Request) {
  const limited = await guard('suggestions', 240, 600)
  if (limited) return limited
  const q = new URL(req.url).searchParams.get('q') ?? ''
  const items = (await suggest(q)).map(({ type, url, title, subtitle, badge }) => ({ type, url, title, subtitle, badge }))
  return json({ items })
}
