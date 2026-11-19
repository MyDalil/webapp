import { describe, expect, it } from 'vitest'
import { partnerFirst } from './partner'

describe('classement « Partenaire »', () => {
  const hits = [
    { id: 'a', score: 3, paid: false },
    { id: 'b', score: 2, paid: false },
    { id: 'c', score: 2, paid: true },
    { id: 'd', score: 1, paid: true },
  ]
  it('à pertinence égale seulement, le partenaire passe devant', () => {
    const out = partnerFirst(hits, (h) => h.paid, (h) => String(h.score)).map((h) => h.id)
    expect(out).toEqual(['a', 'c', 'b', 'd'])
  })
})
