import { describe, expect, it } from 'vitest'
import { daysLeft, trashCutoff } from './purge'

describe('corbeille 30 jours', () => {
  const now = new Date('2026-11-14T12:00:00Z')
  it('seuil de suppression : 30 jours avant maintenant', () => {
    expect(trashCutoff(now).toISOString()).toBe('2026-10-15T12:00:00.000Z')
  })
  it('jours restants : 30 le jour même, 1 la veille de la fin, jamais négatif', () => {
    expect(daysLeft('2026-11-14T12:00:00Z', now)).toBe(30)
    expect(daysLeft('2026-10-16T13:00:00Z', now)).toBe(2)
    expect(daysLeft('2026-10-15T13:00:00Z', now)).toBe(1)
    expect(daysLeft('2026-09-01T00:00:00Z', now)).toBe(0)
  })
})
