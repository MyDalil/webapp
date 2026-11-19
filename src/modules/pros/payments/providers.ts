import type { chargilyConfig, stripeConfig } from './core'

/**
 * Appels HTTP aux fournisseurs (fetch, sans SDK). Une erreur réseau ou une réponse inattendue
 * donne `{ error }` : jamais d’exception, jamais de clé ni de réponse brute dans le message.
 */
type Fetch = typeof fetch
export type CheckoutCreated = { id: string; url: string } | { error: string }

const TIMEOUT = 10_000

/** Chargily Pay V2 : POST {base}/checkouts (JSON, `Authorization: Bearer <clé secrète>`). */
export async function createChargilyCheckout(
  cfg: NonNullable<ReturnType<typeof chargilyConfig>>,
  input: { amount: number; successUrl: string; failureUrl: string; webhookUrl: string; locale: 'fr' | 'en' | 'ar'; description: string; method?: 'cib' | 'edahabia'; paymentId: number },
  f: Fetch = fetch,
): Promise<CheckoutCreated> {
  try {
    const res = await f(`${cfg.base}/checkouts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.key}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        amount: input.amount,
        currency: 'dzd',
        success_url: input.successUrl,
        failure_url: input.failureUrl,
        webhook_endpoint: input.webhookUrl,
        locale: input.locale,
        description: input.description,
        // Identifiant DALIL : retrouve le paiement si le webhook arrive avant l’enregistrement de `externalId`.
        metadata: { payment_id: String(input.paymentId) },
        ...(input.method ? { payment_method: input.method } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT),
    })
    const data = (await res.json().catch(() => null)) as { id?: unknown; checkout_url?: unknown } | null
    if (!res.ok || typeof data?.id !== 'string' || typeof data.checkout_url !== 'string') {
      console.error('[paiement] Chargily a refusé la création du paiement', res.status)
      return { error: 'Le service de paiement Chargily ne répond pas. Réessayez dans quelques minutes.' }
    }
    return { id: data.id, url: data.checkout_url }
  } catch (e) {
    console.error('[paiement] Chargily injoignable', (e as Error).name)
    return { error: 'Le service de paiement Chargily ne répond pas. Réessayez dans quelques minutes.' }
  }
}

/** Stripe : POST https://api.stripe.com/v1/checkout/sessions (formulaire encodé, authentification « clé: »). */
export async function createStripeCheckout(
  cfg: NonNullable<ReturnType<typeof stripeConfig>>,
  input: { amount: number; name: string; successUrl: string; cancelUrl: string; reference: string; paymentId: number; locale: 'fr' | 'en' | 'auto'; email?: string },
  f: Fetch = fetch,
): Promise<CheckoutCreated> {
  const form = new URLSearchParams({
    mode: 'payment',
    'line_items[0][price_data][currency]': 'eur',
    'line_items[0][price_data][unit_amount]': String(input.amount),
    'line_items[0][price_data][product_data][name]': input.name.slice(0, 200),
    'line_items[0][quantity]': '1',
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    client_reference_id: input.reference.slice(0, 200),
    'metadata[payment_id]': String(input.paymentId),
    locale: input.locale,
  })
  if (input.email) form.set('customer_email', input.email.slice(0, 800))
  try {
    const res = await f('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Basic ${Buffer.from(`${cfg.key}:`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
      signal: AbortSignal.timeout(TIMEOUT),
    })
    const data = (await res.json().catch(() => null)) as { id?: unknown; url?: unknown } | null
    if (!res.ok || typeof data?.id !== 'string' || typeof data.url !== 'string') {
      console.error('[paiement] Stripe a refusé la création de la session', res.status)
      return { error: 'Le service de paiement Stripe ne répond pas. Réessayez dans quelques minutes.' }
    }
    return { id: data.id, url: data.url }
  } catch (e) {
    console.error('[paiement] Stripe injoignable', (e as Error).name)
    return { error: 'Le service de paiement Stripe ne répond pas. Réessayez dans quelques minutes.' }
  }
}
