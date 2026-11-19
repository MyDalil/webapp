import { confirmRef } from '@/platform/telegram/callback'
import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Paiements en ligne — règles pures, testées (aucun accès à la base ni au réseau).
 * Sources (consultées le 19 nov. 2026) : docs/paiements.md.
 *
 * Unités (une seule règle) :
 * - `amount.value` (entrée de createCheckout, comme le global `pricing`) : unités monétaires — dinars ou euros ;
 * - `payments.amount` : centimes entiers (règle de la collection : 1 500 DA = 150000) ;
 * - Chargily `amount` : entier en dinars (exemple officiel : `2000`, `dzd`) → centimes / 100 ;
 * - Stripe `unit_amount` / `amount_total` : « smallest currency unit » (centimes d’euro) → centimes tels quels.
 */
export type Currency = 'DZD' | 'EUR'
export type OnlineProvider = 'chargily' | 'stripe'
export const PAYMENT_PURPOSES = ['abonnement', 'boost', 'projecteur', 'leads', 'autre'] as const
export type PaymentPurpose = (typeof PAYMENT_PURPOSES)[number]
export const MANUAL_PROVIDERS = ['baridimob', 'ccp', 'virement', 'especes'] as const
export type ManualProvider = (typeof MANUAL_PROVIDERS)[number]

export const PURPOSE_LABEL: Record<PaymentPurpose, string> = { abonnement: 'Abonnement', boost: 'Boost', projecteur: 'Projecteur', leads: 'Pack de demandes', autre: 'Autre' }
export const PROVIDER_NAME: Record<OnlineProvider | ManualProvider, string> = { chargily: 'Chargily (CIB, Edahabia)', stripe: 'Stripe (carte)', baridimob: 'BaridiMob', ccp: 'CCP', virement: 'Virement', especes: 'Espèces' }

/** Garde-fou : 10 millions d’unités au plus par paiement. */
export const MAX_CENTS = 1_000_000_000

/** Devise imposée par fournisseur : Chargily encaisse en dinars, Stripe en euros. */
export const PROVIDER_CURRENCY: Record<OnlineProvider, Currency> = { chargily: 'DZD', stripe: 'EUR' }

/** Unités → centimes entiers. Null si invalide : négatif, plus de 2 décimales, dinars non entiers, hors plafond. */
export function toCents(value: unknown, currency: Currency): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null
  const cents = Math.round(value * 100)
  if (Math.abs(cents - value * 100) > 1e-6) return null
  if (currency === 'DZD' && cents % 100 !== 0) return null
  return cents > MAX_CENTS ? null : cents
}

/** Centimes → montant envoyé au fournisseur. */
export const providerAmount = (cents: number, provider: OnlineProvider) => (provider === 'chargily' ? cents / 100 : cents)
/** Montant reçu du fournisseur → centimes. */
export const providerToCents = (amount: number, provider: OnlineProvider) => (provider === 'chargily' ? Math.round(amount * 100) : amount)

export function formatAmount(cents: number, currency: string) {
  const v = cents / 100
  if (currency === 'DZD') return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(v)} DA`
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(v)
}

/** Comparaison en temps constant de deux signatures hexadécimales. */
export function safeEqualHex(a: string, b: string) {
  const x = Buffer.from(a, 'utf8')
  const y = Buffer.from(b, 'utf8')
  return x.length === y.length && timingSafeEqual(x, y)
}

const hmacHex = (key: string, body: string) => createHmac('sha256', key).update(body, 'utf8').digest('hex')

/** Chargily : en-tête `signature` = HMAC-SHA256 (hex) du corps brut, clé = clé secrète de l’API. */
export function verifyChargily(raw: string, signature: string | null | undefined, secret: string): boolean {
  if (!secret || !signature || !/^[0-9a-f]{64}$/i.test(signature.trim())) return false
  return safeEqualHex(hmacHex(secret, raw), signature.trim().toLowerCase())
}

/** Tolérance d’horodatage Stripe : 5 minutes (valeur par défaut des bibliothèques officielles). */
export const STRIPE_TOLERANCE = 300

/**
 * Stripe : en-tête `Stripe-Signature` (`t=…,v1=…[,v1=…][,v0=…,…]`). Seuls `t` et `v1` comptent ;
 * signature attendue = HMAC-SHA256 (hex) de `${t}.${corps brut}`, clé = secret `whsec_…` du point d’arrivée.
 */
export function verifyStripe(raw: string, header: string | null | undefined, secret: string, now = Math.floor(Date.now() / 1000), tolerance = STRIPE_TOLERANCE): { ok: true } | { ok: false; reason: 'absente' | 'invalide' | 'expiree' } {
  if (!secret || !header) return { ok: false, reason: 'absente' }
  let t: number | null = null
  const v1: string[] = []
  for (const part of header.split(',')) {
    const i = part.indexOf('=')
    if (i < 1) continue
    const k = part.slice(0, i).trim()
    const v = part.slice(i + 1).trim()
    if (k === 't' && /^\d{1,12}$/.test(v)) t = Number(v)
    else if (k === 'v1' && /^[0-9a-f]{64}$/i.test(v)) v1.push(v.toLowerCase())
  }
  if (t == null || !v1.length) return { ok: false, reason: 'invalide' }
  const want = hmacHex(secret, `${t}.${raw}`)
  // Toutes les signatures sont comparées (pas de sortie anticipée) : temps constant.
  const match = v1.map((s) => safeEqualHex(want, s)).includes(true)
  if (!match) return { ok: false, reason: 'invalide' }
  return Math.abs(now - t) > tolerance ? { ok: false, reason: 'expiree' } : { ok: true }
}

/**
 * Évènement normalisé, commun aux deux fournisseurs. `paymentId` : identifiant DALIL du paiement (métadonnée `payment_id`
 * posée à la création du checkout) ; `createdAt` : date de l’évènement en millisecondes (absente si illisible).
 */
type EventRef = { eventId: string; externalId: string; paymentId?: string; createdAt?: number }
export type ProviderEvent =
  | ({ kind: 'paid'; amount: number; currency: string } & EventRef)
  | ({ kind: 'failed'; reason: string } & EventRef)
  | { kind: 'ignored'; eventId: string; type: string }

type Obj = Record<string, unknown>
const obj = (v: unknown): Obj => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : {})
const str = (v: unknown) => (typeof v === 'string' ? v : '')

/** `payment_id` d’une métadonnée (objet, ou tableau d’objets chez Chargily) : chiffres seulement. */
function metaPaymentId(meta: unknown): string | undefined {
  const list = Array.isArray(meta) ? meta : [meta]
  for (const m of list) {
    const v = obj(m).payment_id
    const s = typeof v === 'number' ? String(v) : str(v)
    if (/^\d{1,12}$/.test(s)) return s
  }
  return undefined
}
/** Date d’évènement : secondes Unix (Stripe `created`, Chargily `created_at`) ou date ISO. */
function eventTime(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v < 1e12 ? v * 1000 : v
  const t = typeof v === 'string' ? Date.parse(v) : NaN
  return Number.isFinite(t) ? t : undefined
}

/** Chargily : `checkout.paid` (statut `paid`) ; `checkout.failed`, `checkout.canceled` ; le reste est ignoré. */
export function parseChargilyEvent(body: unknown): ProviderEvent {
  const e = obj(body)
  const type = str(e.type)
  const data = obj(e.data)
  const eventId = str(e.id)
  const externalId = str(data.id)
  if (!externalId) return { kind: 'ignored', eventId, type }
  const ref = { eventId, externalId, paymentId: metaPaymentId(data.metadata), createdAt: eventTime(e.created_at) }
  if (type === 'checkout.paid' && data.status === 'paid' && typeof data.amount === 'number') return { kind: 'paid', ...ref, amount: data.amount, currency: str(data.currency) }
  if (type === 'checkout.failed' || type === 'checkout.canceled' || type === 'checkout.expired') return { kind: 'failed', ...ref, reason: type }
  return { kind: 'ignored', eventId, type }
}

/**
 * Stripe : `checkout.session.completed` avec `payment_status` = `paid`, ou `checkout.session.async_payment_succeeded` → payé ;
 * `checkout.session.async_payment_failed`, `checkout.session.expired` → échec ; le reste est ignoré.
 */
export function parseStripeEvent(body: unknown): ProviderEvent {
  const e = obj(body)
  const type = str(e.type)
  const s = obj(obj(e.data).object)
  const eventId = str(e.id)
  const externalId = str(s.id)
  if (!externalId || s.object !== 'checkout.session') return { kind: 'ignored', eventId, type }
  const ref = { eventId, externalId, paymentId: metaPaymentId(s.metadata), createdAt: eventTime(e.created) }
  if ((type === 'checkout.session.completed' || type === 'checkout.session.async_payment_succeeded') && s.payment_status === 'paid' && typeof s.amount_total === 'number') {
    return { kind: 'paid', ...ref, amount: s.amount_total, currency: str(s.currency) }
  }
  if (type === 'checkout.session.async_payment_failed' || type === 'checkout.session.expired') return { kind: 'failed', ...ref, reason: type }
  return { kind: 'ignored', eventId, type }
}

/** Le montant et la devise payés correspondent-ils exactement au paiement enregistré ? */
export function amountMatches(payment: { amount: number; currency: string }, ev: { amount: number; currency: string }, provider: OnlineProvider) {
  return providerToCents(ev.amount, provider) === payment.amount && ev.currency.toUpperCase() === String(payment.currency).toUpperCase()
}

/** Configuration Chargily (null = désactivé). Mode : CHARGILY_MODE (test|live), sinon déduit de la clé (`test_…`). */
export function chargilyConfig(env: Record<string, string | undefined> = process.env) {
  const key = env.CHARGILY_SECRET_KEY?.trim()
  if (!key) return null
  const mode: 'test' | 'live' = env.CHARGILY_MODE === 'test' || env.CHARGILY_MODE === 'live' ? env.CHARGILY_MODE : key.startsWith('test_') ? 'test' : 'live'
  return { key, mode, base: mode === 'test' ? 'https://pay.chargily.net/test/api/v2' : 'https://pay.chargily.net/api/v2' }
}

/** Configuration Stripe (null = désactivé) : clé secrète ET secret du webhook, sinon aucun paiement ne serait confirmé. */
export function stripeConfig(env: Record<string, string | undefined> = process.env) {
  const key = env.STRIPE_SECRET_KEY?.trim()
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET?.trim()
  if (!key || !webhookSecret) return null
  return { key, webhookSecret, mode: (/^(sk|rk)_test_/.test(key) ? 'test' : 'live') as 'test' | 'live' }
}

export const DISABLED: Record<OnlineProvider, string> = {
  chargily: 'Paiement par carte CIB ou Edahabia indisponible pour le moment. Réglez par BaridiMob, CCP ou virement et envoyez votre reçu.',
  stripe: 'Paiement par carte bancaire indisponible pour le moment. Réglez par virement et envoyez votre reçu.',
}

/** Référence de confirmation Telegram pour `valider_paiement` (format de `confirmRef` : « v-12 »). */
export const confirmPaymentRef = (paymentId: number) => confirmRef('valider_paiement', { id: paymentId }) ?? `v-${paymentId}`
