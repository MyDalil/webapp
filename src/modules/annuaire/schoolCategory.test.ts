import { describe, expect, it } from 'vitest'
import { schoolCategory } from './schoolCategory'

const cat = (n: string) => schoolCategory(n)?.category ?? null

describe('niveau d’une école', () => {
  it('lit le niveau dans le nom', () => {
    expect(cat('Auto Ecolé Aziz')).toBe('Auto-écoles')
    expect(cat('Crèche Toyor Eljannah')).toBe('Crèches')
    expect(cat('C.E.M Fodhil Aamar')).toBe('Collèges')
    expect(cat('CEM ATHMANI MOHAMED')).toBe('Collèges')
    expect(cat('متوسطة الشهيد')).toBe('Collèges')
    expect(cat('Lycée Sidi Ahmed Tidjani')).toBe('Lycées')
    expect(cat('Ecole primaire Zaouia')).toBe('Écoles primaires')
    expect(cat('Élémentaire Ibn Sina')).toBe('Écoles primaires')
  })
  it('école coranique : rubrique Vie musulmane', () => {
    expect(schoolCategory('École Coranique')).toEqual({ sector: 'mosquees-priere', category: 'Écoles coraniques' })
  })
  it('nom sans niveau : rien n’est deviné', () => {
    expect(cat('École Noble')).toBeNull()
    expect(cat('Hamidi Ahmed')).toBeNull()
    expect(cat('Lead Academy')).toBeNull()
    expect(cat('Ciment et cemento')).toBeNull()
  })
})
