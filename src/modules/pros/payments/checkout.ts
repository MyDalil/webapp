import { DISABLED, PAYMENT_PURPOSES, PROVIDER_CURRENCY, PURPOSE_LABEL, chargilyConfig, providerAmount, stripeConfig, toCents, type OnlineProvider, type PaymentPurpose } from './core'
import { relId, type Deps } from './deps'
import { createChargilyCheckout, createStripeCheckout } from './providers'
import { appendNote } from './settle'

/**
 * Contrat du 3ᵉ tour (lot L2) : `amount.value` en unités (dinars ou euros, comme le global `pricing`).
 * Champs facultatifs en plus du contrat (compatibles) : `sponsorshipId` (boost, projecteur), `method` (Chargily : cib | edahabia),
 * `lang` (langue de la page de paiement et du retour), `email` (pré-rempli chez Stripe).
 */
export type CheckoutInput = {
  purpose: PaymentPurpose
  subscriptionId?: number
  sponsorshipId?: number
  amount: { value: number; currency: 'DZD' | 'EUR' }
  memberId: number
  provider: OnlineProvider
  method?: 'cib' | 'edahabia'
  lang?: 'fr' | 'en' | 'ar'
  email?: string
}
export type CheckoutResult = { url: string } | { error: string }

/** Crée d’abord un paiement « en attente », puis la page de paiement du fournisseur ; renvoie son adresse. */
export async function createCheckoutWith(deps: Deps, input: CheckoutInput): Promise<CheckoutResult> {
  if (!PAYMENT_PURPOSES.includes(input?.purpose)) return { error: 'Objet du paiement inconnu.' }
  if (input.provider !== 'chargily' && input.provider !== 'stripe') return { error: 'Moyen de paiement inconnu.' }
  const currency = PROVIDER_CURRENCY[input.provider]
  if (input.amount?.currency !== currency) return { error: input.provider === 'chargily' ? 'CIB et Edahabia : paiement en dinars (DZD) seulement.' : 'Carte bancaire internationale : paiement en euros (EUR) seulement.' }
  const cents = toCents(input.amount.value, currency)
  if (cents == null) return { error: 'Montant invalide.' }
  if (!Number.isInteger(input.memberId) || input.memberId < 1) return { error: 'Connectez-vous pour payer.' }
  if (input.method && input.method !== 'cib' && input.method !== 'edahabia') return { error: 'Carte inconnue : CIB ou Edahabia.' }
  const chargily = input.provider === 'chargily' ? chargilyConfig(deps.env) : null
  const stripe = input.provider === 'stripe' ? stripeConfig(deps.env) : null
  if (!chargily && !stripe) return { error: DISABLED[input.provider] }

  const p = await deps.db()
  // Le paiement porte sur un objet du membre lui-même, encore en attente.
  if (input.subscriptionId != null) {
    const s = await p.findByID({ collection: 'subscriptions', id: input.subscriptionId, depth: 0, overrideAccess: true }).catch(() => null)
    if (!s || relId(s.member) !== input.memberId) return { error: 'Abonnement introuvable.' }
    if (s.status !== 'en_attente') return { error: 'Cet abonnement n’attend pas de paiement.' }
  }
  if (input.sponsorshipId != null) {
    const s = await p.findByID({ collection: 'sponsorships', id: input.sponsorshipId, depth: 0, overrideAccess: true }).catch(() => null)
    if (!s || relId(s.requestedBy) !== input.memberId) return { error: 'Mise en avant introuvable.' }
    if (s.status !== 'demande') return { error: 'Cette mise en avant n’attend pas de paiement.' }
  }
  if (input.purpose === 'abonnement' && input.subscriptionId == null) return { error: 'Abonnement à préciser.' }

  const payment = await p.create({
    collection: 'payments',
    data: {
      provider: input.provider,
      amount: cents,
      currency,
      status: 'en_attente',
      purpose: input.purpose,
      member: input.memberId,
      ...(input.subscriptionId != null ? { subscription: input.subscriptionId } : {}),
      ...(input.sponsorshipId != null ? { sponsorship: input.sponsorshipId } : {}),
      note: `Paiement en ligne créé par le membre (${chargily ? `Chargily, mode ${chargily.mode}` : `Stripe, mode ${stripe!.mode}`}).`,
    },
    overrideAccess: true,
  })
  const id = Number(payment.id)
  const lang = input.lang === 'en' || input.lang === 'ar' ? input.lang : 'fr'
  const back = (q: string) => `${deps.site}/api/paiement/retour?lang=${lang}&${q}`
  const label = `DALIL — ${PURPOSE_LABEL[input.purpose]} (P-${id})`

  const created = chargily
    ? await createChargilyCheckout(chargily, { amount: providerAmount(cents, 'chargily'), successUrl: back('etat=ok'), failureUrl: back('etat=echec'), webhookUrl: `${deps.site}/api/paiement/chargily`, locale: lang, description: label, method: input.method, paymentId: id }, deps.fetch)
    : await createStripeCheckout(stripe!, { amount: providerAmount(cents, 'stripe'), name: label, successUrl: back('etat=ok'), cancelUrl: back('etat=annule'), reference: `P-${id}`, paymentId: id, locale: lang === 'ar' ? 'auto' : lang, email: input.email }, deps.fetch)

  if ('error' in created) {
    await p.update({ collection: 'payments', id, data: { status: 'annule', note: appendNote(payment.note, 'Création chez le fournisseur refusée ou impossible.') }, overrideAccess: true }).catch(() => null)
    return { error: created.error }
  }
  await p.update({ collection: 'payments', id, data: { externalId: created.id, reference: created.id }, overrideAccess: true })
  return { url: created.url }
}
