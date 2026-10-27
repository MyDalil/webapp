import { describe, expect, it } from 'vitest'
import { categoryOf } from './category'

describe('categoryOf', () => {
  it('reconnaît une catégorie au singulier, sans accent', () => {
    expect(categoryOf('mosquee')?.category).toBe('Mosquées')
    expect(categoryOf('Pharmacie')?.category).toBe('Pharmacies')
    expect(categoryOf('hôpital')?.category).toBe('Hôpitaux')
    expect(categoryOf('masjid')?.category).toBe('Mosquées')
  })
  it('ne devine pas', () => {
    expect(categoryOf('mosquée ketchaoua')).toBeNull()
    expect(categoryOf('')).toBeNull()
  })
})
