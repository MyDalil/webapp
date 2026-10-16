import { actOnMission, currentMember, getMission } from '@/modules/services'
import { fail, json } from '@/platform/http'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const member = await currentMember()
  if (!member) return fail('Non connecté.', 401)
  const r = await getMission(member, Number((await params).id))
  return 'error' in r ? fail(r.error, r.status) : json({ mission: r })
}

/** Actions : accept, decline, cancel, complete. */
export async function POST(req: Request, { params }: Ctx) {
  const member = await currentMember()
  if (!member) return fail('Non connecté.', 401)
  const b = await req.json().catch(() => ({}))
  const r = await actOnMission(member, Number((await params).id), String(b.action ?? ''), typeof b.reason === 'string' ? b.reason : undefined)
  return 'error' in r ? fail(r.error, r.status) : json({ mission: r })
}
