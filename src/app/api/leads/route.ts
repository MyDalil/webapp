import { fail, json } from '@/platform/http'
import { guard } from '@/platform/security/rateLimit'
import { proofError } from '@/platform/security/proof'
import { currentMember } from '@/modules/membres'
import { submitLead, validateLead } from '@/modules/pros'

/** Demande d’un visiteur sur une fiche privée (devis, pré-inscription, rappel) : limite de débit, preuve anti-robot, validation. */
export async function POST(req: Request) {
  const limited = await guard('leads', 5, 3600)
  if (limited) return limited
  const robot = await proofError(req)
  if (robot) return fail(robot, 403)
  const v = validateLead(await req.json().catch(() => null))
  if (!v.ok) return fail(v.error)
  const member = await currentMember().catch(() => null)
  const r = await submitLead(v.lead, { memberId: (member as { id?: number } | null)?.id ?? null })
  if (!r.ok) return fail(r.error, r.status)
  return json({ ok: true })
}
