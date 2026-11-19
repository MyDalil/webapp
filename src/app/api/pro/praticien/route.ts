import { currentMember, myAgendaLinks, myPractitioner, practitionerAgenda, saveMyPractitioner } from '@/modules/sante'
import { fail, json } from '@/platform/http'

export async function GET() {
  const member = await currentMember()
  if (!member) return fail('Non connecté.', 401)
  const practitioner = await myPractitioner(member)
  return json({ practitioner, agenda: await practitionerAgenda(member), calendar: practitioner ? myAgendaLinks(practitioner) : null })
}

export async function PUT(req: Request) {
  const member = await currentMember()
  if (!member) return fail('Non connecté.', 401)
  const r = await saveMyPractitioner(member, await req.json().catch(() => ({})))
  return 'error' in r ? fail(r.error, r.status) : json({ practitioner: r })
}
