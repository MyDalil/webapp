import { cancel, currentMember } from '@/modules/sante'
import { fail, json } from '@/platform/http'
import { guard } from '@/platform/security/rateLimit'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = await guard('rdv-annulation', 20, 3600)
  if (limited) return limited
  const member = await currentMember()
  if (!member) return fail('Non connecté.', 401)
  const body = await req.json().catch(() => ({}))
  const by = body.by === 'practitioner' ? 'practitioner' : 'patient'
  const r = await cancel(Number((await params).id), by, typeof body.reason === 'string' ? body.reason : undefined)
  return 'error' in r ? fail(r.error, r.status) : json(r)
}
