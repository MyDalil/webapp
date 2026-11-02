import { Resend } from 'resend'
import { fail, json, payload } from '@/platform/http'
import { applyEvent } from '@/platform/mailing/track'

/**
 * Webhook Resend : délivré, rebond, plainte, retard, échec → suivi des emails (/admin › Pilotage › Emails envoyés).
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
  const applied = await applyEvent(await payload(), event.type ?? '', event.data?.email_id ?? '')
  return json({ ok: true, applique: applied })
}
