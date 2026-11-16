import { practitionerFeed } from '@/modules/sante'
import { fail } from '@/platform/http'
import { guard } from '@/platform/security/rateLimit'

/** Abonnement d’agenda d’un praticien (Google, Apple, Outlook) : lien secret, sans connexion. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; token: string }> }) {
  const limited = await guard('agenda-abonnement', 120, 3600)
  if (limited) return limited
  const { id, token } = await params
  const ics = await practitionerFeed(Number(id), token.replace(/\.ics$/, ''))
  if (!ics) return fail('Agenda introuvable.', 404)
  return new Response(ics, { headers: { 'content-type': 'text/calendar; charset=utf-8', 'cache-control': 'private, max-age=900' } })
}
