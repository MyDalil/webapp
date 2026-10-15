import { book, currentMember, myAppointments } from '@/modules/sante'
import { fail, json } from '@/platform/http'

export async function GET() {
  const member = await currentMember()
  if (!member) return fail('Non connecté.', 401)
  return json({ appointments: await myAppointments(member) })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const r = await book({
    slug: String(body.praticien ?? ''),
    start: String(body.start ?? ''),
    mode: body.mode === 'visio' ? 'visio' : 'cabinet',
    reason: typeof body.reason === 'string' ? body.reason : undefined,
    consent: body.consent === true,
    replaces: Number(body.replaces) || undefined,
  })
  return 'error' in r ? fail(r.error, r.status) : json(r, 201)
}
