import { describe, expect, it } from 'vitest'
import { accentFr, splitPlaceName } from './accents'

describe('accentFr', () => {
  it('rétablit les accents des noms importés', () => {
    expect(accentFr('Ecole pour Enfants Handicapés Visuels')).toBe('École pour Enfants Handicapés Visuels')
    expect(accentFr('ECOLE PRIMAIRE EL AMIR')).toBe('École Primaire El Amir')
    expect(accentFr('CHU DE TIZI OUZOU')).toBe('CHU de Tizi Ouzou')
    expect(accentFr('Etablissement hospitalier specialise')).toBe('Établissement hospitalier spécialisé')
    expect(accentFr('Mosquee El Feth')).toBe('Mosquée El Feth')
  })
  it('laisse un nom juste ou inconnu identique', () => {
    expect(accentFr('École Ibn Khaldoun')).toBe('École Ibn Khaldoun')
    expect(accentFr('Hotel Sofitel')).toBe('Hotel Sofitel')
    expect(accentFr('مدرسة')).toBe('مدرسة')
  })
})

describe('splitPlaceName', () => {
  it('sépare un nom en plusieurs langues', () => {
    expect(splitPlaceName('Stade du 5 juillet | 5 July Stadium | ملعب 5 جويلية')).toEqual({ name: 'Stade du 5 juillet', nameEn: '5 July Stadium', nameAr: 'ملعب 5 جويلية' })
  })
  it('laisse un nom simple', () => {
    expect(splitPlaceName('Ecole Ibn Badis')).toEqual({ name: 'École Ibn Badis' })
  })
})

describe('tidyCase : sigles gardés (constat du 19 nov. 2026)', async () => {
  const { tidyCase } = await import('./accents')
  it('garde les sigles inconnus et pointés', () => {
    expect(tidyCase('ECOLE NATIONALE SUPERIEURE VETERINAIRE ENSV')).toMatch(/ENSV$/)
    expect(tidyCase('CENTRE CNFPH ALGER')).toBe('Centre CNFPH Alger')
    expect(tidyCase('C.F.P.A EL HARRACH')).toBe('C.F.P.A El Harrach')
    expect(tidyCase('INPED BOUMERDES')).toBe('INPED Boumerdes')
  })
  it('met en casse normale les mots courants', () => {
    expect(tidyCase('ECOLE PRIMAIRE EL AMIR')).toBe('Ecole Primaire El Amir')
    expect(tidyCase('STADE DU 5 JUILLET')).toBe('Stade du 5 Juillet')
  })
})
