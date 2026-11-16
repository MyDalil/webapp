import { appointmentIcs, currentMember } from '@/modules/sante'
import { fail } from '@/platform/http'

/** Télécharger un rendez-vous au format agenda (.ics) : patient ou praticien du rendez-vous seulement. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const member = await currentMember()
  if (!member) return fail('Non connecté.', 401)
  const ics = await appointmentIcs(Number((await params).id), member)
  if (!ics) return fail('Rendez-vous introuvable.', 404)
  return new Response(ics, { headers: { 'content-type': 'text/calendar; charset=utf-8', 'content-disposition': 'attachment; filename="rendez-vous-dalil.ics"', 'cache-control': 'private, no-store' } })
}
