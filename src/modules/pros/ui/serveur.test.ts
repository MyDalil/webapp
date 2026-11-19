import { beforeEach, describe, expect, it, vi } from 'vitest'

/** Parcours pro côté serveur, base en mémoire : pièces privées, /finaliser, abonnement. */
type Doc = Record<string, unknown> & { id: number }
const h = vi.hoisted(() => ({
  tables: {} as Record<string, Doc[]>,
  calls: [] as { op: string; collection: string; data?: Record<string, unknown> }[],
  notify: vi.fn(async (..._a: unknown[]) => {}),
  saveClaimDocument: vi.fn(async (..._a: unknown[]) => ({ id: 900 }) as { id: number } | { error: string }),
  createCheckout: vi.fn(async (..._a: unknown[]) => ({ error: 'Le service de paiement Chargily ne répond pas.' }) as { url: string } | { error: string }),
  pricing: { annualFreeMonths: 2, plans: [{ code: 'pro', monthlyDZD: 1500 }] } as Record<string, unknown>,
}))

vi.mock('server-only', () => ({}))
vi.mock('@/platform/telegram/notify', () => ({ notifyStaff: h.notify }))
vi.mock('@/platform/telegram/callback', () => ({ signCallback: (_op: string, ref: string) => `sig.${ref}`, confirmRef: (name: string, a: { id: unknown; decision?: string }) => `${name}:${String(a.id)}:${a.decision ?? ''}` }))
vi.mock('@/modules/communication', () => ({ verifyFinalizeToken: (t: string) => (t === 'bon' ? { collection: 'places', id: 5 } : null) }))
vi.mock('../claims', () => ({ saveClaimDocument: h.saveClaimDocument }))
vi.mock('../payments/server', () => ({ createCheckout: h.createCheckout, submitPaymentReceipt: vi.fn() }))
vi.mock('../pricing', () => ({ getPricing: async () => h.pricing }))
vi.mock('../subscriptions', () => ({ planOf: async () => 'gratuit' }))
vi.mock('@/platform/http', () => {
  let next = 100
  const match = (d: Doc, w: Record<string, unknown>): boolean => {
    if (Array.isArray(w.and)) return w.and.every((x) => match(d, x as Record<string, unknown>))
    return Object.entries(w).every(([k, c]) => {
      const cond = c as { equals?: unknown; in?: unknown[] }
      if ('equals' in cond) return String(d[k]) === String(cond.equals)
      if (cond.in) return cond.in.map(String).includes(String(d[k]))
      return true
    })
  }
  const db = {
    find: async (a: { collection: string; where?: Record<string, unknown> }) => {
      const docs = (h.tables[a.collection] ?? []).filter((d) => match(d, a.where ?? {}))
      return { docs, totalDocs: docs.length }
    },
    findByID: async (a: { collection: string; id: unknown }) => (h.tables[a.collection] ?? []).find((d) => String(d.id) === String(a.id)) ?? null,
    create: async (a: { collection: string; data: Record<string, unknown> }) => {
      h.calls.push({ op: 'create', collection: a.collection, data: a.data })
      const doc = { id: next++, ...a.data }
      ;(h.tables[a.collection] ??= []).push(doc)
      return doc
    },
    update: async (a: { collection: string; id: unknown; data: Record<string, unknown> }) => {
      h.calls.push({ op: 'update', collection: a.collection, data: a.data })
      const doc = (h.tables[a.collection] ?? []).find((d) => String(d.id) === String(a.id))!
      return Object.assign(doc, a.data)
    },
  }
  return { payload: async () => db }
})

const { createClaim, finalizeDraft, requestSubscription } = await import('./serveur')

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64')
const member = { id: 3, kind: 'pro', email: 'amel@example.dz', firstName: 'Amel', lastName: 'K', phone: '+213 550 12 34 56', _verified: true } as never

beforeEach(() => {
  h.tables = { places: [], claims: [], subscriptions: [], payments: [], members: [] }
  h.calls = []
  h.notify.mockClear()
  h.saveClaimDocument.mockClear()
  h.createCheckout.mockClear()
})

describe('pièce de revendication', () => {
  it('passe par saveClaimDocument (base64 en base), jamais par un upload `file`', async () => {
    h.tables.places.push({ id: 8, slug: 'cafe-test', name: 'Café Test', _status: 'published', phone: '021000000' })
    const r = await createClaim(member, { targetCollection: 'places', slug: 'cafe-test', proofType: 'registre_commerce', proofText: '' }, PNG)
    expect(r).toMatchObject({ ok: true })
    expect(h.saveClaimDocument).toHaveBeenCalledWith({ memberId: 3, filename: 'revendication-places-8.png', mimetype: 'image/png', bytes: expect.any(Buffer) })
    expect(h.calls.filter((c) => c.collection === 'claim-documents')).toHaveLength(0)
    expect(h.tables.claims[0]).toMatchObject({ proofFile: 900, status: 'en_attente' })
    expect(h.notify).toHaveBeenCalledWith(expect.stringMatching(/^Revendication de Café Test .* par Amel K \(amel@example\.dz\)/), expect.anything())
  })
})

describe('/finaliser', () => {
  it('crée une revendication en attente (téléphone identique) sans écrire `owner`', async () => {
    h.tables.places.push({ id: 5, name: 'Boulangerie Nour', _status: 'draft', phone: '0550123456', owner: null })
    const r = await finalizeDraft(member, 'bon')
    expect(r).toMatchObject({ ok: true, placeId: 5 })
    expect(h.calls.some((c) => c.collection === 'places')).toBe(false)
    expect(h.tables.places[0].owner).toBeNull()
    expect(h.tables.claims[0]).toMatchObject({ member: 3, targetCollection: 'places', targetId: '5', proofType: 'telephone', status: 'en_attente' })
    const [text, opts] = h.notify.mock.calls[0] as [string, { buttons: { text: string }[][] }]
    expect(text).toMatch(/^Revendication de Boulangerie Nour .* par Amel K \(amel@example\.dz\)/)
    expect(opts.buttons[0].map((b) => b.text)).toEqual(['Accepter', 'Refuser'])
    // Deuxième ouverture du lien : pas de doublon.
    await finalizeDraft(member, 'bon')
    expect(h.tables.claims).toHaveLength(1)
  })
})

describe('abonnement', () => {
  const body = { targetCollection: 'places', targetId: '5', plan: 'pro', period: 'mensuel', currency: 'DZD', mode: 'en_ligne' }
  beforeEach(() => h.tables.places.push({ id: 5, name: 'Boulangerie Nour', _status: 'draft', owner: 3, slug: 'nour' }))

  it('paiement en ligne impossible : l’abonnement créé passe à « annulee »', async () => {
    const r = await requestSubscription(member, body, null)
    expect(r).toMatchObject({ status: 502 })
    expect(h.tables.subscriptions[0].status).toBe('annulee')
  })

  it('réutilise l’abonnement en attente du même membre sans paiement reçu ; 409 sinon', async () => {
    h.createCheckout.mockResolvedValueOnce({ url: 'https://pay.test/1' })
    h.tables.subscriptions.push({ id: 40, member: 3, targetCollection: 'places', targetId: '5', plan: 'pro_annuel', status: 'en_attente' })
    h.tables.payments.push({ id: 60, subscription: 40, status: 'annule' })
    const r = await requestSubscription(member, body, null)
    expect(r).toMatchObject({ ok: true, id: 40, url: 'https://pay.test/1' })
    expect(h.tables.subscriptions).toHaveLength(1)
    expect(h.tables.subscriptions[0].plan).toBe('pro_mensuel')
    expect(h.createCheckout).toHaveBeenCalledWith(expect.objectContaining({ subscriptionId: 40 }))

    h.tables.payments.push({ id: 61, subscription: 40, status: 'recu' })
    expect(await requestSubscription(member, body, null)).toMatchObject({ status: 409 })
    h.tables.payments.pop()
    h.tables.subscriptions[0].member = 4
    expect(await requestSubscription(member, body, null)).toMatchObject({ status: 409 })
  })
})
