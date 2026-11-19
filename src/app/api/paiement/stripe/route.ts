import { stripeWebhook } from '@/modules/pros'
import { json } from '@/platform/http'

/** Webhook Stripe : `Stripe-Signature` vérifiée sur le corps brut (tolérance 5 minutes) ; 200 pour tout évènement inconnu ou déjà traité. */
export async function POST(req: Request) {
  const raw = await req.text()
  try {
    const r = await stripeWebhook(raw, req.headers.get('stripe-signature'))
    return json(r.body, r.status)
  } catch (e) {
    console.error('[paiement] webhook Stripe en erreur', (e as Error).name)
    return json({ error: 'Erreur, réessayez.' }, 500)
  }
}
