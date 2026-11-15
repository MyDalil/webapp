import { describe, expect, it } from 'vitest'
import { frenchCity } from './cityName'

describe('ville en français', () => {
  it('garde la partie latine déjà présente', () => {
    expect(frenchCity('kolea القليعة', 42)).toBe('Kolea')
    expect(frenchCity('Oran ⵡⴻⵀⵔⴰⵏ وهران', 31)).toBe('Oran')
  })
  it('nom arabe seul : commune du référentiel', () => {
    expect(frenchCity('وهران', 31)).toBe('Oran')
  })
  it('déjà en français ou inconnu : null (rien n’est inventé)', () => {
    expect(frenchCity('Alger', 16)).toBeNull()
    expect(frenchCity('قرية غير معروفة تماما', 16)).toBeNull()
  })
})
