import { Resend } from 'resend'
import { fail, json, payload } from '@/platform/http'
import { applyEvent } from '@/platform/mailing/track'
import { recordInboundEmail } from '@/modules/messages'

/**
 * Webhook Resend : délivré, rebond, plainte, retard, échec → suivi des emails (/admin › Pilotage › Emails envoyés) ;
 * `email.received` (Resend Inbound) → demande « email » dans la boîte unique (contenu lu par l’API Receiving).
 * Signature vérifiée (en-têtes svix-*, secret RESEND_WEBHOOK_SECRET) ; sans secret : refus.
 */
export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) return fail('Webhook désactivé : RESEND_WEBHOOK_SECRET absent.', 503)
  const body = await req.text()
  let event: { type?: string; data?: { email_id?: string } }
  try {
    event = new Resend(process.env.RESEND_API_KEY ?? 're_inutilise').webhooks.verify({
      payload: body,
      headers: { id: req.headers.get('svix-id') ?? '', timestamp: req.headers.get('svix-timestamp') ?? '', signature: req.headers.get('svix-signature') ?? '' },
      webhookSecret: secret,
    }) as typeof event
  } catch {
    return fail('Signature invalide.', 401)
  }
  if (event.type === 'email.received') {
    const key = process.env.RESEND_API_KEY
    if (!key || !event.data?.email_id) return fail('Réception impossible : RESEND_API_KEY absent.', 503)
    const { data, error } = await new Resend(key).emails.receiving.get(event.data.email_id)
    if (error || !data) return fail('Email reçu illisible.', 502) // Resend renvoie le webhook plus tard
    return json({ ok: true, boite: await recordInboundEmail(await payload(), data) })
  }
  const applied = await applyEvent(await payload(), event.type ?? '', event.data?.email_id ?? '')
  return json({ ok: true, applique: applied })
}
