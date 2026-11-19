import { describe, expect, it } from 'vitest'
import { billedMonths, dueReminders, expiredSubIds, freeMonths, levelOf, planFrom, planMonths, subscriptionAmount, subscriptionPeriod } from './subscriptionsCore'

const now = new Date('2026-11-19T10:00:00.000Z')
const day = 86_400_000

describe('abonnements — période', () => {
  it('mensuel : un mois ; annuel : 12 mois (les mois offerts baissent le prix, pas la durée)', () => {
    expect(planMonths('pro_mensuel')).toBe(1)
    expect(planMonths('premium_annuel')).toBe(12)
    expect(billedMonths('pro_annuel', 2)).toBe(10)
    expect(billedMonths('pro_annuel', 0)).toBe(12)
    expect(billedMonths('pro_annuel', 'x')).toBe(10)
    expect(billedMonths('pro_mensuel', 2)).toBe(1)
    expect(freeMonths(null)).toBe(2)
    expect(freeMonths(-1)).toBe(0)
    expect(freeMonths(20)).toBe(11)
    expect(subscriptionPeriod('pro_mensuel', now)).toEqual({ startsAt: now.toISOString(), endsAt: '2026-12-19T10:00:00.000Z' })
    expect(subscriptionPeriod('pro_annuel', now).endsAt).toBe('2027-11-19T10:00:00.000Z')
  })
  it('fin de mois : jamais de débordement (31 janvier + 1 mois = 28 février)', () => {
    expect(subscriptionPeriod('pro_mensuel', new Date('2027-01-31T08:00:00.000Z')).endsAt).toBe('2027-02-28T08:00:00.000Z')
  })
  it('renouvellement : commence à la fin de l’abonnement en cours', () => {
    const p = subscriptionPeriod('pro_mensuel', now, '2026-12-01T00:00:00.000Z')
    expect(p.startsAt).toBe('2026-12-01T00:00:00.000Z')
    expect(p.endsAt).toBe('2027-01-01T00:00:00.000Z')
    expect(subscriptionPeriod('pro_mensuel', now, '2026-01-01T00:00:00.000Z').startsAt).toBe(now.toISOString())
  })
})

describe('abonnements — formule d’une fiche', () => {
  const list = [
    { id: 1, targetCollection: 'places', targetId: '5', plan: 'pro_mensuel', status: 'active', startsAt: '2026-11-01', endsAt: '2026-12-01' },
    { id: 2, targetCollection: 'places', targetId: '5', plan: 'premium_annuel', status: 'en_attente', startsAt: null, endsAt: null },
    { id: 3, targetCollection: 'providers', targetId: '9', plan: 'premium_mensuel', status: 'active', startsAt: '2026-10-01', endsAt: '2026-11-01' },
  ]
  it('formule en cours seulement ; en attente ou finie = gratuit', () => {
    expect(planFrom(list, 'places', 5, now)).toBe('pro')
    expect(planFrom(list, 'providers', '9', now)).toBe('gratuit')
    expect(planFrom(list, 'practitioners', 5, now)).toBe('gratuit')
    expect(levelOf('premium_mensuel')).toBe('premium')
  })
  it('expiration et rappel unique 7 jours avant', () => {
    const subs = [
      { id: 1, status: 'active', endsAt: new Date(now.getTime() - 1000).toISOString() },
      { id: 2, status: 'active', endsAt: new Date(now.getTime() + 6 * day).toISOString() },
      { id: 3, status: 'active', endsAt: new Date(now.getTime() + 6 * day).toISOString(), remindedAt: '2026-11-18' },
      { id: 4, status: 'active', endsAt: new Date(now.getTime() + 8 * day).toISOString() },
      { id: 5, status: 'annulee', endsAt: new Date(now.getTime() + 2 * day).toISOString() },
    ]
    expect(expiredSubIds(subs, now)).toEqual([1])
    expect(dueReminders(subs, now).map((s) => s.id)).toEqual([2])
  })
})

describe('abonnements — montant', () => {
  const pricing = { annualFreeMonths: 2, plans: [{ code: 'pro', monthlyDZD: 3000, monthlyEUR: null }] }
  it('aucun prix inventé : prix vide → null (« Tarif sur demande »)', () => {
    expect(subscriptionAmount(pricing, 'pro_mensuel', 'DZD')).toBe(3000)
    expect(subscriptionAmount(pricing, 'pro_annuel', 'DZD')).toBe(30000)
    expect(subscriptionAmount({ ...pricing, annualFreeMonths: 0 }, 'pro_annuel', 'DZD')).toBe(36000)
    expect(subscriptionAmount(pricing, 'pro_mensuel', 'EUR')).toBeNull()
    expect(subscriptionAmount(pricing, 'premium_mensuel', 'DZD')).toBeNull()
    expect(subscriptionAmount(null, 'pro_mensuel', 'DZD')).toBeNull()
  })
})
