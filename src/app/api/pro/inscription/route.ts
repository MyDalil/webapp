import { currentMember } from '@/modules/membres'
import { createPlaceDraft } from '@/modules/pros'
import { fail, json } from '@/platform/http'
import { guard } from '@/platform/security/rateLimit'

/** « Inscrire mon activité » → établissement : fiche lieu en brouillon, jamais publiée (décision de l’équipe). */
export async function POST(req: Request) {
  const member = await currentMember()
  if (!member) return fail('Non connecté.', 401)
  const limited = await guard('pro-inscription', 5, 3600, `member:${member.id}`)
  if (limited) return limited
  const r = await createPlaceDraft(member, (await req.json().catch(() => null)) as Record<string, unknown> | null)
  return 'error' in r ? fail(r.error, r.status) : json({ ok: true, id: r.id, message: 'Fiche enregistrée en brouillon. L’équipe DALIL la relit avant publication.' }, 201)
}
