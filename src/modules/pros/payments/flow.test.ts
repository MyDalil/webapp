import { createHmac } from 'crypto'
import { claimDocumentData } from '../claimsCore'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createCheckoutWith } from './checkout'
import type { Db, Deps, Doc } from './deps'
import { submitReceiptWith } from './receipt'
import { validatePayment } from './settle'
import { handleChargilyWebhook, handleStripeWebhook } from './webhooks'

/** Base en mémoire : juste ce que les paiements utilisent. */
function memoryDb(seed: Record<string, Doc[]> = {}) {
  const tables: Record<string, Doc[]> = { payments: [], members: [], subscriptions: [], sponsorships: [], 'claim-documents': [], ...seed }
  let next = 100
  const match = (d: Doc, where: Record<string, unknown>): boolean => {
    if (Array.isArray(where.and)) return where.and.every((w) => match(d, w as Record<string, unknown>))
    return Object.entries(where).every(([k, c]) => {
      const cond = c as { equals?: unknown; in?: unknown[] }
      if ('equals' in cond) return String(d[k]) === String(cond.equals)
      if (cond.in) return cond.in.map(String).includes(String(d[k]))
      return true
    })
  }
  const db: Db = {
    find: async (a) => ({ docs: tables[a.collection as string].filter((d) => match(d, (a.where ?? {}) as Record<string, unknown>)) }),
    findByID: async (a) => tables[a.collection as string].find((d) => String(d.id) === String(a.id)) ?? null,
    create: async (a) => {
      // Même contrat que la collection `claim-documents` : pas d’upload (`file`), champs filename, mimetype, size, data requis.
      if (a.collection === 'claim-documents') {
        const d = (a.data ?? {}) as Record<string, unknown>
        if ('file' in a || !d.filename || !d.mimetype || !d.size || typeof d.data !== 'string') throw new Error('claim-documents : filename, mimetype, size et data requis')
      }
      const doc = { id: next++, ...(a.data as object) } as Doc
      tables[a.collection as string].push(doc)
      return doc
    },
    update: async (a) => {
      const doc = tables[a.collection as string].find((d) => String(d.id) === String(a.id))!
      Object.assign(doc, a.data)
      return doc
    },
  }
  return { db, tables }
}

function makeDeps(db: Db, env: Record<string, string>, fetchImpl?: typeof fetch) {
  const locks = new Set<string>()
  const deps: Deps = {
    db: async () => db,
    notify: vi.fn(async () => {}),
    mail: vi.fn(async () => true),
    sign: (ref) => `x.${ref}.sig`,
    activateSubscription: vi.fn(async () => {}),
    activateSponsorship: vi.fn(async () => {}),
    saveDocument: async (input) => {
      const built = claimDocumentData(input)
      if ('error' in built) return built
      return { id: Number((await db.create({ collection: 'claim-documents', data: built.data, overrideAccess: true })).id) }
    },
    lock: async (k) => (locks.has(k) ? false : (locks.add(k), true)),
    unlock: async (k) => void locks.delete(k),
    fetch: fetchImpl ?? (vi.fn() as unknown as typeof fetch),
    env,
    site: 'https://www.mydalil.com',
    now: () => new Date('2026-11-19T12:00:00Z'),
  }
  return deps
}

const hmac = (k: string, b: string) => createHmac('sha256', k).update(b).digest('hex')
const ENV = { CHARGILY_SECRET_KEY: 'test_sk_secret', STRIPE_SECRET_KEY: 'sk_test_a', STRIPE_WEBHOOK_SECRET: 'whsec_b' }

describe('createCheckout', () => {
  let mem: ReturnType<typeof memoryDb>
  beforeEach(() => {
    mem = memoryDb({ subscriptions: [{ id: 7, member: 3, status: 'en_attente' }], members: [{ id: 3, email: 'pro@example.dz', firstName: 'Amel' }] })
  })

  it('désactivé proprement sans clé', async () => {
    const r = await createCheckoutWith(makeDeps(mem.db, {}), { purpose: 'abonnement', subscriptionId: 7, amount: { value: 1500, currency: 'DZD' }, memberId: 3, provider: 'chargily' })
    expect(r).toEqual({ error: expect.stringMatching(/indisponible/) })
    expect(mem.tables.payments).toHaveLength(0)
  })

  it('Chargily : paiement en attente en centimes, montant envoyé en dinars, externalId = identifiant du checkout', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ id: 'chk_1', checkout_url: 'https://pay.chargily.dz/test/checkouts/chk_1/pay' }), { status: 200 }))
    const r = await createCheckoutWith(makeDeps(mem.db, ENV, f as unknown as typeof fetch), { purpose: 'abonnement', subscriptionId: 7, amount: { value: 1500, currency: 'DZD' }, memberId: 3, provider: 'chargily', method: 'cib' })
    expect(r).toEqual({ url: 'https://pay.chargily.dz/test/checkouts/chk_1/pay' })
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://pay.chargily.net/test/api/v2/checkouts')
    const body = JSON.parse(String(init.body))
    expect(body).toMatchObject({ amount: 1500, currency: 'dzd', payment_method: 'cib', webhook_endpoint: 'https://www.mydalil.com/api/paiement/chargily', metadata: { payment_id: String(mem.tables.payments[0].id) } })
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test_sk_secret')
    expect(mem.tables.payments[0]).toMatchObject({ provider: 'chargily', amount: 150000, currency: 'DZD', status: 'en_attente', purpose: 'abonnement', subscription: 7, externalId: 'chk_1' })
  })

  it('refuse un abonnement d’un autre membre et une devise incohérente', async () => {
    const deps = makeDeps(mem.db, ENV)
    expect(await createCheckoutWith(deps, { purpose: 'abonnement', subscriptionId: 7, amount: { value: 1500, currency: 'DZD' }, memberId: 4, provider: 'chargily' })).toEqual({ error: 'Abonnement introuvable.' })
    expect(await createCheckoutWith(deps, { purpose: 'abonnement', subscriptionId: 7, amount: { value: 15, currency: 'DZD' }, memberId: 3, provider: 'stripe' })).toHaveProperty('error')
  })

  it('Stripe : échec du fournisseur → paiement annulé, erreur claire', async () => {
    const f = vi.fn(async () => new Response('{}', { status: 500 }))
    const r = await createCheckoutWith(makeDeps(mem.db, ENV, f as unknown as typeof fetch), { purpose: 'abonnement', subscriptionId: 7, amount: { value: 12, currency: 'EUR' }, memberId: 3, provider: 'stripe' })
    expect(r).toHaveProperty('error')
    expect(mem.tables.payments[0].status).toBe('annule')
  })
})

describe('webhooks', () => {
  const pending = (over: Partial<Doc> = {}): Doc => ({ id: 1, provider: 'chargily', externalId: 'chk_1', amount: 150000, currency: 'DZD', status: 'en_attente', purpose: 'abonnement', subscription: 7, member: 3, ...over })

  it('Chargily : signature fausse → 403 sans effet', async () => {
    const mem = memoryDb({ payments: [pending()] })
    const raw = JSON.stringify({ id: 'e1', type: 'checkout.paid', data: { id: 'chk_1', status: 'paid', amount: 1500, currency: 'dzd' } })
    const r = await handleChargilyWebhook(makeDeps(mem.db, ENV), raw, hmac('mauvaise', raw))
    expect(r.status).toBe(403)
    expect(mem.tables.payments[0].status).toBe('en_attente')
  })

  it('Chargily payé → reçu, abonnement activé, équipe prévenue, reçu envoyé ; rejeu sans effet', async () => {
    const mem = memoryDb({ payments: [pending()], members: [{ id: 3, email: 'pro@example.dz' }] })
    const deps = makeDeps(mem.db, ENV)
    const raw = JSON.stringify({ id: 'e1', type: 'checkout.paid', data: { id: 'chk_1', status: 'paid', amount: 1500, currency: 'dzd' } })
    const r = await handleChargilyWebhook(deps, raw, hmac(ENV.CHARGILY_SECRET_KEY, raw))
    expect(r).toEqual({ status: 200, body: { ok: true, statut: 'recu' } })
    expect(mem.tables.payments[0]).toMatchObject({ status: 'recu', paidAt: '2026-11-19T12:00:00.000Z' })
    expect(deps.activateSubscription).toHaveBeenCalledWith(7, expect.objectContaining({ paymentId: 1 }))
    expect(deps.notify).toHaveBeenCalledTimes(1)
    expect(deps.mail).toHaveBeenCalledWith('pro@example.dz', expect.any(String), expect.any(String), { idempotencyKey: 'paiement-recu-1' })
    const again = await handleChargilyWebhook(deps, raw, hmac(ENV.CHARGILY_SECRET_KEY, raw))
    expect(again).toEqual({ status: 200, body: { ok: true, deja: 'recu' } })
    expect(deps.activateSubscription).toHaveBeenCalledTimes(1)
  })

  it('montant différent → rien activé, alerte, 200', async () => {
    const mem = memoryDb({ payments: [pending()] })
    const deps = makeDeps(mem.db, ENV)
    const raw = JSON.stringify({ id: 'e1', type: 'checkout.paid', data: { id: 'chk_1', status: 'paid', amount: 15, currency: 'dzd' } })
    const r = await handleChargilyWebhook(deps, raw, hmac(ENV.CHARGILY_SECRET_KEY, raw))
    expect(r.status).toBe(200)
    expect(mem.tables.payments[0].status).toBe('en_attente')
    expect(deps.activateSubscription).not.toHaveBeenCalled()
    expect(deps.notify).toHaveBeenCalledWith(expect.stringMatching(/Alerte/))
  })

  it('Stripe : évènement inconnu → 200 ; boost payé → mise en avant activée', async () => {
    const mem = memoryDb({ payments: [pending({ provider: 'stripe', externalId: 'cs_1', amount: 1250, currency: 'EUR', purpose: 'boost', subscription: null, sponsorship: 9 })] })
    const deps = makeDeps(mem.db, ENV)
    const sign = (raw: string) => `t=${Math.floor(deps.now().getTime() / 1000)},v1=${hmac(ENV.STRIPE_WEBHOOK_SECRET, `${Math.floor(deps.now().getTime() / 1000)}.${raw}`)}`
    const unknown = JSON.stringify({ id: 'evt_0', type: 'customer.created', data: { object: { object: 'customer', id: 'cus_1' } } })
    expect((await handleStripeWebhook(deps, unknown, sign(unknown))).status).toBe(200)
    const raw = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed', data: { object: { object: 'checkout.session', id: 'cs_1', payment_status: 'paid', amount_total: 1250, currency: 'eur' } } })
    expect((await handleStripeWebhook(deps, raw, sign(raw))).body).toEqual({ ok: true, statut: 'recu' })
    expect(deps.activateSponsorship).toHaveBeenCalledWith(9, 1)
    expect((await handleStripeWebhook(deps, raw, 't=1,v1=' + '0'.repeat(64))).status).toBe(400)
  })

  it('échec ou expiration : paiement annulé et abonnement en attente annulé, sauf autre paiement en cours', async () => {
    const mem = memoryDb({ payments: [pending()], subscriptions: [{ id: 7, member: 3, status: 'en_attente' }] })
    const deps = makeDeps(mem.db, ENV)
    const raw = JSON.stringify({ id: 'e2', type: 'checkout.failed', data: { id: 'chk_1' } })
    expect((await handleChargilyWebhook(deps, raw, hmac(ENV.CHARGILY_SECRET_KEY, raw))).body).toEqual({ ok: true, statut: 'annule' })
    expect(mem.tables.subscriptions[0].status).toBe('annulee')

    const other = memoryDb({ payments: [pending(), pending({ id: 2, externalId: 'chk_2' })], subscriptions: [{ id: 7, member: 3, status: 'en_attente' }] })
    await handleChargilyWebhook(makeDeps(other.db, ENV), raw, hmac(ENV.CHARGILY_SECRET_KEY, raw))
    expect(other.tables.payments[0].status).toBe('annule')
    expect(other.tables.subscriptions[0].status).toBe('en_attente')
  })

  it('webhook avant externalId : paiement retrouvé par metadata.payment_id (Stripe et Chargily)', async () => {
    const mem = memoryDb({ payments: [pending({ externalId: null }), pending({ id: 2, provider: 'stripe', externalId: null, amount: 1250, currency: 'EUR' })] })
    const deps = makeDeps(mem.db, ENV)
    const raw = JSON.stringify({ id: 'e1', type: 'checkout.paid', created_at: 1_763_553_600, data: { id: 'chk_9', status: 'paid', amount: 1500, currency: 'dzd', metadata: { payment_id: '1' } } })
    expect((await handleChargilyWebhook(deps, raw, hmac(ENV.CHARGILY_SECRET_KEY, raw))).body).toEqual({ ok: true, statut: 'recu' })
    expect(mem.tables.payments[0]).toMatchObject({ status: 'recu', externalId: 'chk_9' })
    const t = Math.floor(deps.now().getTime() / 1000)
    const s = JSON.stringify({ id: 'evt_2', created: t, type: 'checkout.session.completed', data: { object: { object: 'checkout.session', id: 'cs_9', payment_status: 'paid', amount_total: 1250, currency: 'eur', metadata: { payment_id: '2' } } } })
    expect((await handleStripeWebhook(deps, s, `t=${t},v1=${hmac(ENV.STRIPE_WEBHOOK_SECRET, `${t}.${s}`)}`)).body).toEqual({ ok: true, statut: 'recu' })
    expect(mem.tables.payments[1]).toMatchObject({ status: 'recu', externalId: 'cs_9' })
  })

  it('paiement introuvable : 503 pendant 10 minutes (renvoi du fournisseur), ensuite 200 et alerte équipe', async () => {
    const mem = memoryDb()
    const deps = makeDeps(mem.db, ENV)
    const now = Math.floor(deps.now().getTime() / 1000)
    const ev = (created: number) => JSON.stringify({ id: 'e1', type: 'checkout.paid', created_at: created, data: { id: 'chk_x', status: 'paid', amount: 1500, currency: 'dzd', metadata: { payment_id: '55' } } })
    const recent = ev(now - 60)
    expect((await handleChargilyWebhook(deps, recent, hmac(ENV.CHARGILY_SECRET_KEY, recent))).status).toBe(503)
    expect(deps.notify).not.toHaveBeenCalled()
    const old = ev(now - 11 * 60)
    expect(await handleChargilyWebhook(deps, old, hmac(ENV.CHARGILY_SECRET_KEY, old))).toEqual({ status: 200, body: { ok: true, ignore: 'paiement inconnu' } })
    expect(deps.notify).toHaveBeenCalledWith(expect.stringMatching(/sans paiement DALIL/))
  })

  it('activation en échec : paiement reçu quand même, équipe prévenue pour une activation manuelle', async () => {
    const mem = memoryDb({ payments: [pending()] })
    const deps = makeDeps(mem.db, ENV)
    deps.activateSubscription = vi.fn(async () => { throw new Error('activation automatique indisponible') })
    const raw = JSON.stringify({ id: 'e1', type: 'checkout.paid', data: { id: 'chk_1', status: 'paid', amount: 1500, currency: 'dzd' } })
    expect((await handleChargilyWebhook(deps, raw, hmac(ENV.CHARGILY_SECRET_KEY, raw))).status).toBe(200)
    expect(mem.tables.payments[0].status).toBe('recu')
    expect(deps.notify).toHaveBeenCalledWith(expect.stringMatching(/à la main/))
  })
})

describe('reçu manuel et validation', () => {
  const PDF = Buffer.from('%PDF-1.4\n%test')
  it('crée un paiement en attente avec justificatif privé et un bouton signé ; la validation active', async () => {
    const mem = memoryDb({ subscriptions: [{ id: 7, member: 3, status: 'en_attente' }] })
    const deps = makeDeps(mem.db, ENV)
    const r = await submitReceiptWith(deps, { id: 3, firstName: 'Amel' }, { provider: 'baridimob', reference: 'TX 123', amount: '1 500', currency: 'DZD', purpose: 'abonnement', subscriptionId: '7', file: PDF })
    expect(r).toMatchObject({ ok: true })
    const pay = mem.tables.payments[0]
    expect(pay).toMatchObject({ provider: 'baridimob', amount: 150000, status: 'en_attente', subscription: 7 })
    expect(mem.tables['claim-documents']).toHaveLength(1)
    // Justificatif au format de la collection (base64 en base), lié au membre : l’ancien appel `file:` était refusé.
    expect(mem.tables['claim-documents'][0]).toMatchObject({ member: 3, mimetype: 'application/pdf', size: PDF.length, data: PDF.toString('base64'), filename: expect.stringMatching(/^recu-paiement-3-\d+\.pdf$/) })
    expect(pay.proofFile).toBe(mem.tables['claim-documents'][0].id)
    expect(deps.notify).toHaveBeenCalledWith(expect.any(String), { buttons: [[{ text: 'Confirmer le paiement', data: `x.v-${pay.id}.sig` }]] })
    expect(deps.activateSubscription).not.toHaveBeenCalled()
    expect(await submitReceiptWith(deps, { id: 3 }, { provider: 'baridimob', reference: 'TX 123', amount: '1500', currency: 'DZD', purpose: 'abonnement', file: PDF })).toMatchObject({ status: 409 })
    await validatePayment(deps, Number(pay.id), 'Saïd')
    expect(pay.status).toBe('recu')
    expect(deps.activateSubscription).toHaveBeenCalledWith(7, expect.objectContaining({ by: 'Saïd' }))
    await expect(validatePayment(deps, Number(pay.id), 'Saïd')).rejects.toThrow(/déjà/)
  })
  it('refuse un moyen inconnu, un fichier non justificatif, un abonnement d’un autre membre', async () => {
    const mem = memoryDb({ subscriptions: [{ id: 7, member: 3, status: 'en_attente' }] })
    const deps = makeDeps(mem.db, ENV)
    const base = { provider: 'ccp', reference: 'R1', amount: '1500', currency: 'DZD', purpose: 'abonnement', file: PDF }
    expect(await submitReceiptWith(deps, { id: 3 }, { ...base, provider: 'stripe' })).toMatchObject({ status: 400 })
    expect(await submitReceiptWith(deps, { id: 3 }, { ...base, file: Buffer.from('hello') })).toMatchObject({ status: 400 })
    expect(await submitReceiptWith(deps, { id: 4 }, { ...base, subscriptionId: 7 })).toMatchObject({ status: 404 })
    expect(mem.tables.payments).toHaveLength(0)
  })
})
