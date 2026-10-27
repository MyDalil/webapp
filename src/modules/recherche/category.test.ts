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

describe('categoryPrefix / nameMatch', () => {
  it('sépare la catégorie du nom', async () => {
    const { categoryPrefix } = await import('./category')
    expect(categoryPrefix('Mosquée Cheick Brahim ibrahimi')).toMatchObject({ category: 'Mosquées', name: 'cheick brahim ibrahimi' })
    expect(categoryPrefix('Ketchaoua')).toBeNull()
  })
  it('tolère les fautes légères', async () => {
    const { nameMatch } = await import('./category')
    expect(nameMatch('cheick brahim ibrahimi', 'Masdjid al-Bashir al-Ibrahimi')).toBeGreaterThan(0.3)
    expect(nameMatch('cheick bachir ibrahimi', 'Mosquée Cheikh El Bachir El Ibrahimi')).toBe(1)
    expect(nameMatch('cheick brahim ibrahimi', 'Mosquée El-Fath')).toBe(0)
  })
})
