import { describe, expect, it } from 'vitest'
import { median, scoreClassified, type RiskInput } from './risk'

const base: RiskInput = { title: 'Appartement F3 à Oran', description: 'Bel appartement lumineux, 3e étage, proche du tramway.', category: 'immobilier', price: 9_000_000, photos: 4, reports: 0, authorAgeDays: 200, authorLast24h: 1, medianPrice: 10_000_000, sameText: 0 }

describe('score anti-arnaque', () => {
  it('annonce ordinaire : faible, aucun signal', () => {
    expect(scoreClassified(base)).toEqual({ score: 0, level: 'faible', signals: [] })
  })

  it('avance demandée + contact hors DALIL + prix très bas : élevé, raisons visibles', () => {
    const r = scoreClassified({ ...base, description: 'Je pars à l’étranger. Envoyez un acompte par Western Union, WhatsApp 0550 12 34 56.', price: 2_000_000 })
    expect(r.level).toBe('eleve')
    expect(r.signals.map((s) => s.key)).toEqual(['paiement', 'prix', 'contact', 'pression'])
    expect(r.score).toBe(80)
  })

  it('accents et majuscules sans effet', () => {
    expect(scoreClassified({ ...base, description: 'PAIEMENT AVANT la visite, DÉPART À L’ÉTRANGER' }).signals.map((s) => s.key)).toContain('paiement')
  })

  it('compte neuf, rafale, texte copié, signalements (plafonnés), sans photo', () => {
    const r = scoreClassified({ ...base, photos: 0, reports: 5, authorAgeDays: 1, authorLast24h: 6, sameText: 2 })
    expect(r.signals.find((s) => s.key === 'signalements')?.points).toBe(45)
    expect(r.score).toBe(90)
  })

  it('pas de comparaison de prix sans médiane', () => {
    expect(scoreClassified({ ...base, price: 1, medianPrice: null }).signals).toEqual([])
  })

  it('score plafonné à 100', () => {
    expect(scoreClassified({ ...base, description: 'acompte western union whatsapp urgent', price: 1, photos: 0, reports: 9, authorAgeDays: 0, authorLast24h: 9, sameText: 3 }).score).toBe(100)
  })
})

describe('médiane', () => {
  it('null sous 5 valeurs ; ignore zéros et vides', () => {
    expect(median([1, 2, 3, 4])).toBeNull()
    expect(median([5, 1, 3, 0, 2, 4])).toBe(3)
    expect(median([1, 2, 3, 4, 5, 6])).toBe(3.5)
  })
})
