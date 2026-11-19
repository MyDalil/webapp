import { currentMember } from '@/modules/membres'
import { requestSponsorship } from '@/modules/pros'
import { fail, json } from '@/platform/http'
import { guard } from '@/platform/security/rateLimit'

/** Demande de mise en avant payante par un pro connecté, pour une fiche qu’il possède (activée par l’équipe après paiement). */
export async function POST(req: Request) {
  const member = await currentMember()
  if (!member) return fail('Non connecté.', 401)
  const limited = await guard('pro-sponsoring', 5, 3600, `member:${member.id}`)
  if (limited) return limited
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || typeof body !== 'object') return fail('Demande illisible.')
  const r = await requestSponsorship(member, body)
  return 'error' in r ? fail(r.error, r.status) : json({ ok: true, id: r.id, message: 'Demande reçue. L’équipe DALIL vous contacte pour le paiement (BaridiMob, CCP, CIB ou espèces), puis active la mise en avant.' }, 201)
}
