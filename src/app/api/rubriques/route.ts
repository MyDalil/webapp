import { ActionError } from '@/platform/actions'
import type { StaffRole } from '@/platform/actions/types'
import { fail, json, payload } from '@/platform/http'
import { sameOrigin } from '@/platform/shell/admin/validation'
import { newActionId, runAction } from '@/registry'

/**
 * Interrupteurs de /admin/rubriques : session Payload d’un patron ou d’un admin, même origine, JSON seulement.
 * Passe par l’action `basculer_section` du registre (canal « admin ») : accès, journal d’audit et notification compris.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req.headers.get('origin'), req.url)) return fail('Origine refusée.', 403)
  if (!(req.headers.get('content-type') ?? '').includes('application/json')) return fail('JSON attendu.', 415)
  const p = await payload()
  const { user } = await p.auth({ headers: req.headers })
  const u = user as { id: number; collection?: string; role?: string; name?: string; email?: string } | null
  if (u?.collection !== 'users' || !['admin', 'patron'].includes(String(u.role))) return fail('Réservé au patron et aux administrateurs.', 403)
  const body = (await req.json().catch(() => null)) as { cle?: unknown; coupe?: unknown; message?: unknown } | null
  const input: { cle?: string; coupe?: boolean; message?: string } = {}
  if (typeof body?.cle === 'string') input.cle = body.cle
  if (typeof body?.coupe === 'boolean') input.coupe = body.coupe
  if (typeof body?.message === 'string') input.message = body.message
  try {
    const out = (await runAction('basculer_section', input, {
      principal: { kind: 'staff', userId: u.id, role: u.role as StaffRole, name: String(u.name || u.email || 'Équipe') },
      channel: 'admin',
      actionId: newActionId(),
      lang: 'fr',
    })) as { summary?: string; coupees?: string[] } | null
    return json({ ok: true, summary: out?.summary ?? 'Fait.', coupees: out?.coupees ?? [] })
  } catch (e) {
    if (e instanceof ActionError) return fail(e.message, e.code === 'forbidden' ? 403 : 400)
    return fail('Action non effectuée.', 500)
  }
}
