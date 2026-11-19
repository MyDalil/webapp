import { describe, expect, it } from 'vitest'
import { findWilaya, matchCategory, normalizePhone, validActivity, validName } from './validate'

describe('wilaya saisie', () => {
  it('nom, code, variantes, faute simple ; inconnu refusé', () => {
    expect(findWilaya('Oran')?.code).toBe(31)
    expect(findWilaya('31')?.code).toBe(31)
    expect(findWilaya('wilaya de Sétif')?.code).toBe(19)
    expect(findWilaya('setif')?.code).toBe(19)
    expect(findWilaya('Algiers')?.code).toBe(16)
    expect(findWilaya('الجزائر')?.code).toBe(16)
    expect(findWilaya('Constantin')?.code).toBe(25)
    expect(findWilaya('Bou Saada')?.code).toBe(68)
    expect(findWilaya('69')?.code).toBe(69)
    expect(findWilaya('70')).toBeNull()
    expect(findWilaya('Paris')).toBeNull()
    expect(findWilaya('')).toBeNull()
  })
})

describe('réponses d’inscription', () => {
  it('nom et activité : longueurs, lettres, ni lien ni commande', () => {
    expect(validName('Pharmacie Benali')).toBe('Pharmacie Benali')
    expect(validName('?')).toBeNull()
    expect(validName('1234')).toBeNull()
    expect(validName('www.exemple.com')).toBeNull()
    expect(validName('/start')).toBeNull()
    expect(validName('x'.repeat(121))).toBeNull()
    expect(validActivity('Boulangerie')).toBe('Boulangerie')
    expect(validActivity('ok')).toBeNull()
  })
  it('catégorie du référentiel reconnue sans accent ni pluriel', () => {
    expect(matchCategory('patisserie')).toEqual({ sector: 'restaurants-gastronomie', category: 'Pâtisseries' })
    expect(matchCategory('fabrique de drones')).toBeNull()
  })
  it('téléphone algérien ou international → E.164', () => {
    expect(normalizePhone('0550 12 34 56')).toBe('+213550123456')
    expect(normalizePhone('+213 550 12 34 56')).toBe('+213550123456')
    expect(normalizePhone('00213 (0)661-12-34-56')).toBe('+213661123456')
    expect(normalizePhone('021 23 45 67')).toBe('+21321234567')
    expect(normalizePhone('+33 6 12 34 56 78')).toBe('+33612345678')
    expect(normalizePhone('0812345678')).toBeNull()
    expect(normalizePhone('12')).toBeNull()
    expect(normalizePhone('appelez-moi')).toBeNull()
    expect(normalizePhone('+0 123 456 789')).toBeNull()
  })
})
