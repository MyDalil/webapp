import { chargilyWebhook } from '@/modules/pros'
import { json } from '@/platform/http'

/** Webhook Chargily Pay V2 : en-tête `signature` vérifié sur le corps brut ; 200 pour tout évènement inconnu ou déjà traité. */
export async function POST(req: Request) {
  const raw = await req.text()
  try {
    const r = await chargilyWebhook(raw, req.headers.get('signature'))
    return json(r.body, r.status)
  } catch (e) {
    console.error('[paiement] webhook Chargily en erreur', (e as Error).name)
    return json({ error: 'Erreur, réessayez.' }, 500)
  }
}
