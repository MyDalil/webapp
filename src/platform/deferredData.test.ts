import { describe, expect, it } from 'vitest'
import { deferred, needsReindex } from './deferredData'

describe('données différées et index de recherche', () => {
  it('une étape sans écriture cherchable ne déclenche pas la reconstruction', () => {
    deferred('test_sans_index', async () => {}, { reindex: false })
    deferred('test_avec_index', async () => {})
    expect(needsReindex(['test_sans_index'])).toBe(false)
    expect(needsReindex(['test_sans_index', 'test_avec_index'])).toBe(true)
    expect(needsReindex([])).toBe(false)
  })
})
