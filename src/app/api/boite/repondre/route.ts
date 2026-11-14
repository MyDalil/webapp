import { createLocalReq } from 'payload'
import { replyToSubmission } from '@/modules/messages'
import { clean, fail, json, payload } from '@/platform/http'

/** Répondre à une demande depuis la boîte unique. Équipe seulement ; droits de la session. */
export async function POST(req: Request) {
  const p = await payload()
  const { user } = await p.auth({ headers: req.headers })
  const u = user as { collection?: string; role?: string } | null
  if (u?.collection !== 'users' || !['admin', 'patron', 'editor'].includes(String(u.role))) return fail('Accès refusé.', 401)
  const body = (await req.json().catch(() => ({}))) as { id?: unknown; text?: unknown; status?: unknown }
  const id = Number(body.id)
  if (!Number.isInteger(id) || id <= 0) return fail('Demande manquante.')
  const r = await replyToSubmission(await createLocalReq({ user: user as never }, p), id, clean(body.text, 8000), clean(body.status, 20) || undefined)
  return r.ok ? json(r) : fail(r.error, 422)
}
