import { chargilyConfig, parseChargilyEvent, parseStripeEvent, stripeConfig, verifyChargily, verifyStripe } from './core'
import type { Deps } from './deps'
import { settleEvent, type Settled } from './settle'

/** Corps brut au-delà duquel un évènement est refusé (les évènements des fournisseurs font quelques Ko). */
export const MAX_WEBHOOK_BYTES = 256 * 1024

const parse = (raw: string): unknown => {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/** Webhook Chargily : signature vérifiée sur le corps brut AVANT toute lecture. */
export async function handleChargilyWebhook(deps: Deps, raw: string, signature: string | null): Promise<Settled> {
  const cfg = chargilyConfig(deps.env)
  if (!cfg) return { status: 503, body: { error: 'Paiement Chargily désactivé.' } }
  if (Buffer.byteLength(raw) > MAX_WEBHOOK_BYTES) return { status: 413, body: { error: 'Trop volumineux.' } }
  if (!signature) return { status: 400, body: { error: 'Signature absente.' } }
  if (!verifyChargily(raw, signature, cfg.key)) return { status: 403, body: { error: 'Signature invalide.' } }
  const body = parse(raw)
  if (!body) return { status: 400, body: { error: 'Corps illisible.' } }
  return settleEvent(deps, 'chargily', parseChargilyEvent(body))
}

/** Webhook Stripe : `Stripe-Signature` vérifiée (v1, tolérance 5 minutes) sur le corps brut AVANT toute lecture. */
export async function handleStripeWebhook(deps: Deps, raw: string, header: string | null): Promise<Settled> {
  const cfg = stripeConfig(deps.env)
  if (!cfg) return { status: 503, body: { error: 'Paiement Stripe désactivé.' } }
  if (Buffer.byteLength(raw) > MAX_WEBHOOK_BYTES) return { status: 413, body: { error: 'Trop volumineux.' } }
  const v = verifyStripe(raw, header, cfg.webhookSecret, Math.floor(deps.now().getTime() / 1000))
  if (!v.ok) return { status: 400, body: { error: `Signature ${v.reason}.` } }
  const body = parse(raw)
  if (!body) return { status: 400, body: { error: 'Corps illisible.' } }
  return settleEvent(deps, 'stripe', parseStripeEvent(body))
}
