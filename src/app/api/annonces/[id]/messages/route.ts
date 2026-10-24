import { currentMember, listMessages, postMessage } from '@/modules/annonces'
import { fail, json } from '@/platform/http'
import { guard } from '@/platform/security/rateLimit'

type Ctx = { params: Promise<{ id: string }> }
const contactOf = (req: Request) => {
  const v = Number(new URL(req.url).searchParams.get('contact'))
  return Number.isFinite(v) && v > 0 ? v : undefined
}

/** Conversation d’une annonce. L’annonceur précise la personne (« ?contact=ID »). */
export async function GET(req: Request, { params }: Ctx) {
  const member = await currentMember()
  if (!member) return fail('Non connecté.', 401)
  const r = await listMessages(member, Number((await params).id), contactOf(req))
  return 'error' in r ? fail(r.error, r.status) : json({ messages: r })
}

export async function POST(req: Request, { params }: Ctx) {
  const member = await currentMember()
  if (!member) return fail('Non connecté.', 401)
  const limited = await guard('message', 120, 3600, `m${member.id}`)
  if (limited) return limited
  const b = await req.json().catch(() => ({}))
  const r = await postMessage(member, Number((await params).id), String(b.text ?? ''), contactOf(req))
  return 'error' in r ? fail(r.error, r.status) : json(r, 201)
}
