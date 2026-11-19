import { describe, expect, it } from 'vitest'
import { bearerOf, generateKey, hashKey, matchKey, parseKeys } from './apiKeyCore'

describe('clés API nominatives', () => {
  const key = generateKey()
  const other = generateKey()
  const env = `Rad@MyDalil.com:${hashKey(key)}, ligne-invalide ,said@mydalil.com:${'0'.repeat(64)}`

  it('génère une clé dalil_ unique', () => {
    expect(key).toMatch(/^dalil_[A-Za-z0-9_-]{43}$/)
    expect(key).not.toBe(other)
  })
  it('SHA-256 hexadécimal', () => {
    expect(hashKey('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })
  it('lit la variable : email en minuscules, lignes invalides ignorées', () => {
    expect(parseKeys(env)).toEqual([{ email: 'rad@mydalil.com', hash: hashKey(key) }, { email: 'said@mydalil.com', hash: '0'.repeat(64) }])
    expect(parseKeys(undefined)).toEqual([])
  })
  it('retrouve le titulaire ; refuse une autre clé ou un autre format', () => {
    const entries = parseKeys(env)
    expect(matchKey(key, entries)).toBe('rad@mydalil.com')
    expect(matchKey(other, entries)).toBeNull()
    expect(matchKey('autre_jeton', entries)).toBeNull()
    expect(matchKey(key, [])).toBeNull()
  })
  it('lit l’en-tête Authorization', () => {
    expect(bearerOf('Bearer abc')).toBe('abc')
    expect(bearerOf('bearer  abc ')).toBe('abc')
    expect(bearerOf('Basic abc')).toBeNull()
    expect(bearerOf(null)).toBeNull()
  })
})
