import { ActionError } from '@/platform/actions'
import type { StaffRole } from '@/platform/actions/types'
import { fail, json, payload } from '@/platform/http'
import { actionFor, sameOrigin } from '@/platform/shell/admin/validation'
import { newActionId, runAction } from '@/registry'

/**
 * Boutons de la vue /admin/validation : session Payload d’un patron ou d’un admin, même origine, JSON seulement.
 * Chaque bouton exécute une action du registre (canal « admin ») : accès, journal d’audit et notification compris.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req.headers.get('origin'), req.url)) return fail('Origine refusée.', 403)
  if (!(req.headers.get('content-type') ?? '').includes('application/json')) return fail('JSON attendu.', 415)
  const p = await payload()
  const { user } = await p.auth({ headers: req.headers })
  const u = user as { id: number; collection?: string; role?: string; name?: string; email?: string } | null
  if (u?.collection !== 'users' || !['admin', 'patron'].includes(String(u.role))) return fail('Réservé au patron et aux administrateurs.', 403)
  const body = (await req.json().catch(() => null)) as { kind?: unknown; id?: unknown; op?: unknown; note?: unknown } | null
  const action = actionFor(String(body?.kind ?? ''), String(body?.op ?? ''), Number(body?.id), typeof body?.note === 'string' ? body.note : '')
  if (!action) return fail('Demande invalide.')
  try {
    const out = (await runAction(action.name, action.input, {
      principal: { kind: 'staff', userId: u.id, role: u.role as StaffRole, name: String(u.name || u.email || 'Équipe') },
      channel: 'admin',
      actionId: newActionId(),
      lang: 'fr',
    })) as { summary?: string } | null
    return json({ ok: true, summary: out?.summary ?? 'Fait.' })
  } catch (e) {
    if (e instanceof ActionError) return fail(e.message, e.code === 'forbidden' ? 403 : 400)
    return fail('Action non effectuée.', 500)
  }
}
