import { describe, expect, it } from 'vitest'
import { normalizeMiss } from './misses'

describe('recherches sans résultat : texte gardé', () => {
  it('normalise : minuscules, espaces', () => {
    expect(normalizeMiss('  Notaire   ORAN ')).toBe('notaire oran')
  })
  it('jamais d’email ni de numéro', () => {
    expect(normalizeMiss('contact amina@example.com')).toBeNull()
    expect(normalizeMiss('0550 12 34 56')).toBeNull()
    expect(normalizeMiss('+213 550 123 456')).toBeNull()
  })
  it('garde les nombres courts (wilaya, étage)', () => {
    expect(normalizeMiss('pharmacie de garde 16')).toBe('pharmacie de garde 16')
  })
  it('trop court : rien', () => {
    expect(normalizeMiss('a')).toBeNull()
  })
})
