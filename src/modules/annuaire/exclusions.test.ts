import { describe, expect, it } from 'vitest'
import { exclusionReason } from './exclusions'

describe('exclusionReason', () => {
  it('exclut musique, zaouïas, lieux chiites, alcool', () => {
    expect(exclusionReason({ name: 'Institut de musique El Hachemi Guerouabi', category: 'Universités' })).toBe('musique')
    expect(exclusionReason({ name: 'Zaouïa Tidjaniya Tamacine', category: 'Mosquées', sector: 'mosquees-priere' })).toBe('zaouïa ou confrérie soufie')
    expect(exclusionReason({ name: 'École coranique Zaouiya Aba Nadjim', category: 'Écoles', sector: 'education-formation' })).toBe('zaouïa ou confrérie soufie')
    expect(exclusionReason({ name: 'Husseiniya', category: 'Mosquées' })).toBe('lieu chiite')
    expect(exclusionReason({ name: 'Le Cabaret', category: 'Restaurants', sector: 'restaurants-gastronomie' })).toBe('sert de l’alcool')
  })
  it('garde les lieux nommés d’après une ville, un quartier ou une personne', () => {
    expect(exclusionReason({ name: 'ZAOUIA LEKBIRA', category: 'Bureaux de poste', sector: 'administrations-services-publics' })).toBeNull()
    expect(exclusionReason({ name: 'Ecole primaire Zaouia', category: 'Écoles', sector: 'education-formation' })).toBeNull()
    expect(exclusionReason({ name: 'Lycée Sidi Ahmed Tidjani', category: 'Écoles', sector: 'education-formation' })).toBeNull()
    expect(exclusionReason({ name: 'Milk Bar', category: 'Cafés', sector: 'restaurants-gastronomie' })).toBeNull()
    expect(exclusionReason({ name: 'Solution Pub', category: 'Administrations', sector: 'administrations-services-publics' })).toBeNull()
    expect(exclusionReason({ name: 'Mosquée Ketchaoua', category: 'Mosquées', sector: 'mosquees-priere' })).toBeNull()
  })
})
