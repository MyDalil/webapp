import { beforeEach, describe, expect, it, vi } from 'vitest'

const revalidateTag = vi.fn()
const revalidatePath = vi.fn()
vi.mock('next/cache', () => ({ revalidateTag: (...a: unknown[]) => revalidateTag(...a), revalidatePath: (...a: unknown[]) => revalidatePath(...a) }))

import { activationError, expiredIds } from './sponsoringCore'
import { SPONSORSHIPS_TAG, refreshSponsorships } from './refresh'
import { Payments } from './Payments'
import { Sponsorships } from './Sponsorships'

describe('activationError', () => {
  it('refuse le passage à « active » sans paiement reçu ni note', () => {
    expect(activationError({ status: 'active', previousStatus: 'demande', paymentNote: '  ', hasReceivedPayment: false })).toMatch(/paiement/)
  })
  it('accepte avec un paiement reçu lié ou une note explicite', () => {
    expect(activationError({ status: 'active', previousStatus: 'demande', hasReceivedPayment: true })).toBeNull()
    expect(activationError({ status: 'active', previousStatus: 'demande', paymentNote: 'CCP 15 000 DA réf. 123', hasReceivedPayment: false })).toBeNull()
  })
  it('ne contrôle pas les autres états ni une sponsorisation déjà active', () => {
    expect(activationError({ status: 'refusee', previousStatus: 'demande', hasReceivedPayment: false })).toBeNull()
    expect(activationError({ status: 'active', previousStatus: 'active', hasReceivedPayment: false })).toBeNull()
  })
})

describe('expiredIds', () => {
  const now = new Date('2026-11-19T12:00:00Z')
  it('garde les actives dont la fin est passée', () => {
    const list = [
      { id: 1, status: 'active' as const, endsAt: '2026-11-19T11:00:00Z' },
      { id: 2, status: 'active' as const, endsAt: '2026-11-20T00:00:00Z' },
      { id: 3, status: 'terminee' as const, endsAt: '2026-11-01T00:00:00Z' },
      { id: 4, status: 'active' as const, endsAt: null },
    ]
    expect(expiredIds(list, now)).toEqual([1])
  })
})

describe('refreshSponsorships', () => {
  beforeEach(() => {
    revalidateTag.mockReset()
    revalidatePath.mockReset()
  })
  it('vide l’étiquette et rafraîchit la liste, la recherche et l’accueil dans les trois langues', () => {
    refreshSponsorships(['practitioners'])
    expect(revalidateTag).toHaveBeenCalledWith(SPONSORSHIPS_TAG, { expire: 0 })
    const paths = revalidatePath.mock.calls.map((c) => c[0])
    for (const l of ['fr', 'en', 'ar']) {
      expect(paths).toContain(`/${l}/praticiens`)
      expect(paths).toContain(`/${l}/recherche`)
      expect(paths).toContain(`/${l}`)
    }
    expect(paths).not.toContain('/fr/annonces')
  })
  it('hors contexte Next : aucune erreur', () => {
    revalidateTag.mockImplementation(() => {
      throw new Error('Invariant: static generation store missing')
    })
    expect(() => refreshSponsorships(['places'])).not.toThrow()
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})

describe('schéma', () => {
  it('paiements réservés aux administrateurs, montant en centimes entiers', () => {
    const editor = { req: { user: { collection: 'users', role: 'editor' } } } as never
    expect(Payments.access?.read?.(editor)).toBe(false)
    const amount = Payments.fields.flatMap((f) => ('fields' in f ? f.fields : [f])).find((f) => 'name' in f && f.name === 'amount') as { validate: (v: unknown) => unknown }
    expect(amount.validate(1500.5)).not.toBe(true)
    expect(amount.validate(150000)).toBe(true)
  })
  it('pays par défaut DZ sur les sponsorisations', () => {
    const country = Sponsorships.fields.find((f) => 'name' in f && f.name === 'country') as { defaultValue: string }
    expect(country.defaultValue).toBe('DZ')
  })
})
