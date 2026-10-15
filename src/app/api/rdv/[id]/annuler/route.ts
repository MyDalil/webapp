import { cancel, currentMember } from '@/modules/sante'
import { fail, json } from '@/platform/http'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const member = await currentMember()
  if (!member) return fail('Non connecté.', 401)
  const body = await req.json().catch(() => ({}))
  const by = body.by === 'practitioner' ? 'practitioner' : 'patient'
  const r = await cancel(Number((await params).id), by, typeof body.reason === 'string' ? body.reason : undefined)
  return 'error' in r ? fail(r.error, r.status) : json(r)
}
