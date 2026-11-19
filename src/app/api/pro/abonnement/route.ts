import { currentMember } from '@/modules/membres'
import { requestSubscription } from '@/modules/pros'
import { proofFileError } from '@/modules/pros/ui'
import { fail, json } from '@/platform/http'
import { readFile } from '@/platform/storage/images'
import { guard } from '@/platform/security/rateLimit'

/**
 * Choix de la formule (multipart) : abonnement « en attente », puis paiement en ligne (url renvoyée)
 * ou reçu (BaridiMob, CCP, virement : justificatif privé + référence → paiement en attente). Activation par l’équipe.
 */
export async function POST(req: Request) {
  const member = await currentMember()
  if (!member) return fail('Non connecté.', 401)
  const limited = await guard('pro-abonnement', 6, 3600, `member:${member.id}`)
  if (limited) return limited
  const form = await req.formData().catch(() => null)
  if (!form) return fail('Demande illisible.')
  const f = form.get('file')
  const file = f && typeof f !== 'string' && f.size ? f : null
  const bad = proofFileError(file)
  if (bad) return fail(bad)
  const body = Object.fromEntries(['targetCollection', 'targetId', 'plan', 'period', 'currency', 'mode', 'method', 'reference'].map((k) => [k, form.get(k)]))
  const r = await requestSubscription(member, body, file ? await readFile(file) : null)
  return 'error' in r ? fail(r.error, r.status) : json({ ok: true, id: r.id, url: r.url, message: r.message }, 201)
}
