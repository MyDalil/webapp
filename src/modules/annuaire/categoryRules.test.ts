import { describe, expect, it } from 'vitest'
import { refinedCategory } from './categoryRules'

describe('rangement des fourre-tout', () => {
  it('médecins : les dentistes à part', () => {
    expect(refinedCategory('Médecins', 'Cabinet dentaire Dr Amrani')).toBe('Dentistes')
    expect(refinedCategory('Médecins', 'عيادة طب الأسنان')).toBe('Dentistes')
    expect(refinedCategory('Médecins', 'Dr Beddek Gynecologue')).toBeNull()
  })
  it('services automobiles', () => {
    expect(refinedCategory('Services automobiles', 'Station Naftal')).toBe('Stations-service')
    expect(refinedCategory('Services automobiles', 'Lavage Auto Express')).toBe('Lavage auto')
    expect(refinedCategory('Services automobiles', 'Garage Mohamed')).toBeNull()
  })
  it('administrations', () => {
    expect(refinedCategory('Administrations', 'Tribunal de Blida')).toBe('Tribunaux')
    expect(refinedCategory('Administrations', 'Agence CNAS Oran')).toBe('Sécurité sociale')
    expect(refinedCategory('Administrations', 'Daïra de Kolea')).toBe('Wilayas et daïras')
    expect(refinedCategory('Administrations', 'APC Hydra')).toBe('Services municipaux')
    expect(refinedCategory('Administrations', 'Ministère du Travail et de la sécurité sociale')).toBe('Ministères')
    expect(refinedCategory('Administrations', 'Sonelgaz')).toBeNull()
  })
  it('autre catégorie : rien', () => {
    expect(refinedCategory('Restaurants', 'Station pizza')).toBeNull()
  })
})
