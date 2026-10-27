import { clean, fail, isEmail, json } from '@/platform/http'
import { guard } from '@/platform/security/rateLimit'
import { proofError } from '@/platform/security/proof'
import { createRequest } from '@/modules/accompagnement'

export async function POST(req: Request) {
  const limited = await guard('accompagnement', 5, 3600)
  if (limited) return limited
  const robot = await proofError(req)
  if (robot) return fail(robot, 403)
  const body = await req.json().catch(() => null)
  if (clean(body?.website)) return json({ ok: true, waitlist: true })
  const name = clean(body?.name, 120)
  const email = clean(body?.email, 200)
  if (name.length < 2) return fail('Indiquez votre nom.')
  if (!isEmail(email)) return fail('Adresse email invalide.')
  const r = await createRequest({ pack: clean(body?.pack, 80), name, email, phone: clean(body?.phone, 30), country: clean(body?.country, 80), message: clean(body?.message, 3000), persons: Math.min(20, Math.max(1, Math.floor(Number(body?.persons) || 1))) })
  return r.ok ? json(r) : fail(r.error, 404)
}
