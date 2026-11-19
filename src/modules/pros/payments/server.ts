import 'server-only'
import type { ActionContext } from '@/platform/actions/types'
import { payload } from '@/platform/http'
import { send } from '@/platform/mail'
import { SITE } from '@/platform/site'
import { hit, release } from '@/platform/security/rateLimit'
import { signCallback } from '@/platform/telegram/callback'
import { notifyStaff } from '@/platform/telegram/notify'
import { actions as sponsoringActions } from '../actions'
import { saveClaimDocument } from '../claims'
import { activateSubscription as activateK } from '../subscriptions'
import { createCheckoutWith, type CheckoutInput, type CheckoutResult } from './checkout'
import type { ActivateSubscription, Db, Deps } from './deps'
import { submitReceiptWith, type ReceiptInput, type ReceiptResult } from './receipt'
import { handleChargilyWebhook, handleStripeWebhook } from './webhooks'

/** `activateSubscription` du lot K (même module : import direct). */
const activateSubscription: ActivateSubscription = (id, opts) => activateK(id, opts)

/** Boost / projecteur : mise en avant liée, activée par l’action existante `activer_sponsoring` (paiement « reçu »). */
const activateSponsorship = async (sponsorshipId: number, paymentId: number) => {
  const def = sponsoringActions.find((a) => a.name === 'activer_sponsoring')
  if (!def) throw new Error('action activer_sponsoring absente')
  const ctx: ActionContext = { principal: { kind: 'public' }, channel: 'cron', actionId: `paiement-${paymentId}`, lang: 'fr' }
  await def.run({ id: sponsorshipId, paiementId: paymentId }, ctx)
}

export const paymentDeps = (): Deps => ({
  db: async () => (await payload()) as unknown as Db,
  notify: (text, opts) => notifyStaff(text, opts),
  mail: (to, subject, html, opts) => send(to, subject, html, opts),
  sign: (ref) => signCallback('x', ref),
  activateSubscription,
  activateSponsorship,
  saveDocument: saveClaimDocument,
  lock: async (key) => (await hit('paiement-evt', key, 1, 3600)) === 0,
  unlock: (key) => release('paiement-evt', key),
  fetch: (...a) => fetch(...a),
  env: process.env,
  site: SITE,
  now: () => new Date(),
})

/** Contrat du 3ᵉ tour : page de paiement Chargily (DZD) ou Stripe (EUR) ; `{ error }` clair si le fournisseur est désactivé. */
export const createCheckout = (input: CheckoutInput): Promise<CheckoutResult> => createCheckoutWith(paymentDeps(), input)
export const submitPaymentReceipt = (member: Parameters<typeof submitReceiptWith>[1], input: ReceiptInput): Promise<ReceiptResult> => submitReceiptWith(paymentDeps(), member, input)
export const chargilyWebhook = (raw: string, signature: string | null) => handleChargilyWebhook(paymentDeps(), raw, signature)
export const stripeWebhook = (raw: string, header: string | null) => handleStripeWebhook(paymentDeps(), raw, header)
