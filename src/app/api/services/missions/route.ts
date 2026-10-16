import { currentMember, myMissions, requestMission } from '@/modules/services'
import { fail, json } from '@/platform/http'

export async function GET() {
  const member = await currentMember()
  if (!member) return fail('Non connecté.', 401)
  return json({ missions: await myMissions(member) })
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}))
  const r = await requestMission({
    slug: String(b.prestataire ?? ''),
    activity: String(b.activity ?? ''),
    start: String(b.start ?? ''),
    hours: Number(b.hours) || undefined,
    commune: String(b.commune ?? ''),
    address: String(b.address ?? ''),
    details: typeof b.details === 'string' ? b.details : undefined,
    gender: typeof b.gender === 'string' ? b.gender : undefined,
    consent: b.consent === true,
  })
  return 'error' in r ? fail(r.error, r.status) : json(r, 201)
}
