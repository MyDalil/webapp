import { currentMember, listMessages, postMessage } from '@/modules/services'
import { fail, json } from '@/platform/http'
import { guard } from '@/platform/security/rateLimit'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const member = await currentMember()
  if (!member) return fail('Non connecté.', 401)
  const r = await listMessages(member, Number((await params).id))
  return 'error' in r ? fail(r.error, r.status) : json({ messages: r })
}

export async function POST(req: Request, { params }: Ctx) {
  const member = await currentMember()
  if (!member) return fail('Non connecté.', 401)
  const limited = await guard('message', 120, 3600, `m${member.id}`)
  if (limited) return limited
  const b = await req.json().catch(() => ({}))
  const r = await postMessage(member, Number((await params).id), String(b.body ?? ''))
  return 'error' in r ? fail(r.error, r.status) : json({ message: r }, 201)
}
