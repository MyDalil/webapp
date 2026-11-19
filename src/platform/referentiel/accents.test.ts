import { describe, expect, it } from 'vitest'
import { accentFr } from './accents'

describe('accentFr', () => {
  it('rétablit les accents des noms importés', () => {
    expect(accentFr('Ecole pour Enfants Handicapés Visuels')).toBe('École pour Enfants Handicapés Visuels')
    expect(accentFr('ECOLE PRIMAIRE')).toBe('ÉCOLE PRIMAIRE')
    expect(accentFr('Etablissement hospitalier specialise')).toBe('Établissement hospitalier spécialisé')
    expect(accentFr('Mosquee El Feth')).toBe('Mosquée El Feth')
  })
  it('laisse un nom juste ou inconnu identique', () => {
    expect(accentFr('École Ibn Khaldoun')).toBe('École Ibn Khaldoun')
    expect(accentFr('Hotel Sofitel')).toBe('Hotel Sofitel')
    expect(accentFr('مدرسة')).toBe('مدرسة')
  })
})
