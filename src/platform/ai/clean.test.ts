import { describe, expect, it } from 'vitest'
import { simpleClean } from './clean'

describe('simpleClean', () => {
  it('retire les hésitations et remet la ponctuation', () => {
    expect(simpleClean('euh je cherche euh un plombier , à Alger', { sentence: true })).toBe('Je cherche un plombier, à Alger.')
  })
  it('fusionne les bégaiements sans toucher au reste', () => {
    expect(simpleClean('je je voudrais un un rendez-vous demain')).toBe('Je voudrais un rendez-vous demain')
    expect(simpleClean('à Bab Ezzouar à Bab Ezzouar samedi')).toBe('À Bab Ezzouar samedi')
  })
  it('garde les mots qui ressemblent à des hésitations', () => {
    expect(simpleClean('Hubert habite Bensalem')).toBe('Hubert habite Bensalem')
  })
  it('fonctionne en arabe et en anglais', () => {
    expect(simpleClean('um I need a a dentist')).toBe('I need a dentist')
    expect(simpleClean('أريد أريد طبيب')).toBe('أريد طبيب')
  })
  it('renvoie une chaîne vide pour du silence', () => {
    expect(simpleClean(' euh… hum ')).toBe('')
  })
})
