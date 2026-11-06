import { describe, expect, it } from 'vitest'
import { looksLikeBotName } from './spam'

describe('looksLikeBotName', () => {
  it('repère la vague de novembre 2026', () => {
    for (const n of ['Lrxivwzz LLC', 'Dkofizpdyx LLC', 'Bhdippnt LLC']) expect(looksLikeBotName(n)).toBe(true)
  })
  it('laisse passer les vrais noms', () => {
    for (const n of ['Boulangerie El Djazair', 'Cabinet Benali', 'Sonelgaz', 'Pharmacie Centrale', 'Atlas Voyages LLC', 'Restaurant Le Tlemcen', 'Mohamed', 'Kheireddine Transport'])
      expect(looksLikeBotName(n)).toBe(false)
  })
})
