import { activateRole, reserveRole } from '@/modules/agents'
import { clean, fail, json, payload } from '@/platform/http'

export const maxDuration = 60

/** Activer un rôle en réserve (test à froid) ou le remettre en réserve. Administrateur ou patron seulement. */
export async function POST(req: Request) {
  const p = await payload()
  const { user } = await p.auth({ headers: req.headers })
  const u = user as { collection?: string; role?: string; id?: number; name?: string } | null
  if (u?.collection !== 'users' || !['admin', 'patron'].includes(String(u.role))) return fail('Accès refusé.', 401)
  const body = (await req.json().catch(() => ({}))) as { slug?: unknown; action?: unknown }
  const slug = clean(body.slug, 40)
  if (!slug) return fail('Rôle manquant.')
  const r = body.action === 'reserve' ? await reserveRole(p, slug, u) : await activateRole(p, slug, u)
  return json(r, r.ok ? 200 : 422)
}
