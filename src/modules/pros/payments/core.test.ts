import { createHmac } from 'crypto'
import { describe, expect, it } from 'vitest'
import { amountMatches, chargilyConfig, parseChargilyEvent, parseStripeEvent, providerAmount, stripeConfig, toCents, verifyChargily, verifyStripe } from './core'
import { paymentReturnHtml } from './returnPage'

const hmac = (k: string, b: string) => createHmac('sha256', k).update(b).digest('hex')

describe('montants', () => {
  it('unités → centimes, refus des montants invalides', () => {
    expect(toCents(1500, 'DZD')).toBe(150000)
    expect(toCents(12.5, 'EUR')).toBe(1250)
    expect(toCents(12.345, 'EUR')).toBeNull()
    expect(toCents(1500.5, 'DZD')).toBeNull()
    expect(toCents(0, 'DZD')).toBeNull()
    expect(toCents(-3, 'EUR')).toBeNull()
    expect(toCents('10', 'EUR')).toBeNull()
  })
  it('conversion par fournisseur : Chargily en dinars, Stripe en centimes', () => {
    expect(providerAmount(150000, 'chargily')).toBe(1500)
    expect(providerAmount(1250, 'stripe')).toBe(1250)
    expect(amountMatches({ amount: 150000, currency: 'DZD' }, { amount: 1500, currency: 'dzd' }, 'chargily')).toBe(true)
    expect(amountMatches({ amount: 150000, currency: 'DZD' }, { amount: 1400, currency: 'dzd' }, 'chargily')).toBe(false)
    expect(amountMatches({ amount: 1250, currency: 'EUR' }, { amount: 1250, currency: 'usd' }, 'stripe')).toBe(false)
  })
})

describe('signature Chargily', () => {
  const raw = '{"type":"checkout.paid"}'
  it('accepte le HMAC hex du corps brut, refuse tout le reste', () => {
    expect(verifyChargily(raw, hmac('test_sk_x', raw), 'test_sk_x')).toBe(true)
    expect(verifyChargily(raw + ' ', hmac('test_sk_x', raw), 'test_sk_x')).toBe(false)
    expect(verifyChargily(raw, hmac('autre', raw), 'test_sk_x')).toBe(false)
    expect(verifyChargily(raw, null, 'test_sk_x')).toBe(false)
    expect(verifyChargily(raw, 'abc', 'test_sk_x')).toBe(false)
  })
})

describe('signature Stripe', () => {
  const raw = '{"id":"evt_1"}'
  const t = 1_800_000_000
  const sig = hmac('whsec_x', `${t}.${raw}`)
  it('accepte un v1 valide parmi plusieurs entrées, ignore v0', () => {
    expect(verifyStripe(raw, `t=${t},v1=${'0'.repeat(64)},v1=${sig},v0=${sig},secret=whsec_***`, 'whsec_x', t + 10)).toEqual({ ok: true })
  })
  it('refuse une signature v0 seule, un corps modifié ou un horodatage hors tolérance', () => {
    expect(verifyStripe(raw, `t=${t},v0=${sig}`, 'whsec_x', t).ok).toBe(false)
    expect(verifyStripe(raw + 'x', `t=${t},v1=${sig}`, 'whsec_x', t).ok).toBe(false)
    expect(verifyStripe(raw, `t=${t},v1=${sig}`, 'whsec_x', t + 301)).toEqual({ ok: false, reason: 'expiree' })
    expect(verifyStripe(raw, null, 'whsec_x', t)).toEqual({ ok: false, reason: 'absente' })
  })
})

describe('évènements', () => {
  it('Chargily : payé, échec, inconnu', () => {
    expect(parseChargilyEvent({ id: 'e1', type: 'checkout.paid', data: { id: 'c1', status: 'paid', amount: 1500, currency: 'dzd' } })).toEqual({ kind: 'paid', eventId: 'e1', externalId: 'c1', amount: 1500, currency: 'dzd' })
    expect(parseChargilyEvent({ id: 'e2', type: 'checkout.failed', data: { id: 'c1' } }).kind).toBe('failed')
    expect(parseChargilyEvent({ id: 'e3', type: 'checkout.paid', data: { id: 'c1', status: 'pending', amount: 1 } }).kind).toBe('ignored')
    expect(parseChargilyEvent({ type: 'autre' }).kind).toBe('ignored')
  })
  it('Stripe : payé seulement si payment_status = paid', () => {
    const s = { object: 'checkout.session', id: 'cs_1', amount_total: 1250, currency: 'eur' }
    expect(parseStripeEvent({ id: 'evt', type: 'checkout.session.completed', data: { object: { ...s, payment_status: 'paid' } } }).kind).toBe('paid')
    expect(parseStripeEvent({ id: 'evt', type: 'checkout.session.completed', data: { object: { ...s, payment_status: 'unpaid' } } }).kind).toBe('ignored')
    expect(parseStripeEvent({ id: 'evt', type: 'checkout.session.async_payment_succeeded', data: { object: { ...s, payment_status: 'paid' } } }).kind).toBe('paid')
    expect(parseStripeEvent({ id: 'evt', type: 'checkout.session.expired', data: { object: s } }).kind).toBe('failed')
    expect(parseStripeEvent({ id: 'evt', type: 'invoice.paid', data: { object: { object: 'invoice', id: 'in_1' } } }).kind).toBe('ignored')
  })
})

describe('configuration', () => {
  it('désactivé sans clé ; mode test déduit ou imposé', () => {
    expect(chargilyConfig({})).toBeNull()
    expect(chargilyConfig({ CHARGILY_SECRET_KEY: 'test_sk_a' })?.base).toBe('https://pay.chargily.net/test/api/v2')
    expect(chargilyConfig({ CHARGILY_SECRET_KEY: 'live_sk_a', CHARGILY_MODE: 'test' })?.mode).toBe('test')
    expect(chargilyConfig({ CHARGILY_SECRET_KEY: 'live_sk_a' })?.base).toBe('https://pay.chargily.net/api/v2')
    expect(stripeConfig({ STRIPE_SECRET_KEY: 'sk_test_a' })).toBeNull()
    expect(stripeConfig({ STRIPE_SECRET_KEY: 'sk_test_a', STRIPE_WEBHOOK_SECRET: 'whsec_b' })?.mode).toBe('test')
  })
})

describe('page de retour', () => {
  it('non indexée, trilingue, arabe en RTL, texte échappé', () => {
    const fr = paymentReturnHtml({}, 'https://www.mydalil.com')
    expect(fr).toContain('Paiement reçu, activation en cours')
    expect(fr).toContain('noindex')
    expect(fr).toContain('https://www.mydalil.com/espace-pro')
    const ar = paymentReturnHtml({ lang: 'ar', etat: 'echec' }, 'https://www.mydalil.com')
    expect(ar).toContain('dir="rtl"')
    expect(ar).toContain('/ar/espace-pro')
    expect(paymentReturnHtml({ lang: '<x>', etat: '<script>' }, 'https://s')).not.toContain('<script>')
  })
})
