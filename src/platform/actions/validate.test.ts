import { describe, expect, it } from 'vitest'
import { validateInput } from './validate'
import { absoluteUrl, slugFrom } from './url'
import { wilayaCode, matchesWords } from './fields'

const schema = {
  type: 'object',
  properties: { texte: { type: 'string', maxLength: 5 }, n: { type: 'integer', minimum: 1, maximum: 3 }, mode: { type: 'string', enum: ['a', 'b'] }, flag: { type: 'boolean' } },
  required: ['texte'],
}

describe('validateInput', () => {
  it('accepte une entrée valide, retire les champs inconnus et nettoie les espaces', () => {
    expect(validateInput(schema, { texte: ' abc ', n: 2, mode: 'a', pirate: 1 })).toEqual({ ok: true, value: { texte: 'abc', n: 2, mode: 'a' } })
  })
  it('refuse un champ obligatoire absent ou vide', () => {
    expect(validateInput(schema, {}).ok).toBe(false)
    expect(validateInput(schema, { texte: '   ' }).ok).toBe(false)
  })
  it('contrôle type, enum, maxLength, bornes', () => {
    expect(validateInput(schema, { texte: 3 }).ok).toBe(false)
    expect(validateInput(schema, { texte: 'abcdef' }).ok).toBe(false)
    expect(validateInput(schema, { texte: 'a', mode: 'z' }).ok).toBe(false)
    expect(validateInput(schema, { texte: 'a', n: 1.5 }).ok).toBe(false)
    expect(validateInput(schema, { texte: 'a', n: 9 }).ok).toBe(false)
    expect(validateInput(schema, { texte: 'a', flag: 'oui' }).ok).toBe(false)
  })
  it('refuse une entrée qui n’est pas un objet', () => {
    expect(validateInput(schema, ['x']).ok).toBe(false)
    expect(validateInput({ type: 'object', properties: {} }, undefined)).toEqual({ ok: true, value: {} })
  })
})

describe('adresses et référentiels', () => {
  it('url absolue avec la langue', () => {
    expect(absoluteUrl('/adresses/x')).toBe('https://www.mydalil.com/adresses/x')
    expect(absoluteUrl('/adresses/x', 'en')).toBe('https://www.mydalil.com/en/adresses/x')
  })
  it('slug depuis une adresse', () => {
    expect(slugFrom('https://www.mydalil.com/adresses/cafe-x?y=1')).toBe('cafe-x')
    expect(slugFrom('cafe-x')).toBe('cafe-x')
  })
  it('wilaya par nom ou par code', () => {
    expect(wilayaCode('Alger')).toBe('16')
    expect(wilayaCode('bejaia')).toBe('6')
    expect(wilayaCode('16')).toBe('16')
    expect(wilayaCode('99')).toBeNull()
    expect(wilayaCode('Paris')).toBeNull()
  })
  it('mots recherchés sans accent', () => {
    expect(matchesWords('Passeport biométrique', 'biometrique passeport')).toBe(true)
    expect(matchesWords('Passeport', 'visa')).toBe(false)
  })
})
