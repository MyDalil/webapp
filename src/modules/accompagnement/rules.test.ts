import { describe, expect, it } from 'vitest'
import { effectiveMode, isWhatsApp, priceLabel } from './rules'

describe('effectiveMode', () => {
  it('cache l’offre en production par défaut', () => {
    expect(effectiveMode(undefined, 'production')).toBe('cache')
    expect(effectiveMode('cache', 'production')).toBe('cache')
  })
  it('montre la liste d’attente hors production', () => {
    expect(effectiveMode('cache', 'preview')).toBe('liste-attente')
    expect(effectiveMode(null, undefined)).toBe('liste-attente')
  })
  it('respecte un mode ouvert ou liste d’attente choisi', () => {
    expect(effectiveMode('ouvert', 'production')).toBe('ouvert')
    expect(effectiveMode('liste-attente', 'production')).toBe('liste-attente')
  })
})

describe('priceLabel', () => {
  it('n’invente jamais un prix', () => {
    expect(priceLabel({})).toEqual({ main: 'Tarif annoncé au lancement', sub: null })
    expect(priceLabel({ priceEur: 0 })).toEqual({ main: 'Tarif annoncé au lancement', sub: null })
  })
  it('affiche l’euro, puis le dinar s’il est saisi', () => {
    expect(priceLabel({ priceEur: 89 })).toEqual({ main: '89 €', sub: 'Équivalent en dinars annoncé au lancement' })
    expect(priceLabel({ priceEur: 89, priceDa: 20000 })).toEqual({ main: '89 €', sub: 'ou 20 000 DA' })
  })
})

describe('isWhatsApp', () => {
  it('accepte un numéro international', () => {
    expect(isWhatsApp('+213 555 12 34 56')).toBe(true)
    expect(isWhatsApp('abc')).toBe(false)
  })
})
