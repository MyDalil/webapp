import { describe, expect, it } from 'vitest'
import { csvDataRows, hasMore, maxCalls, mergeReports, progress, type Report } from './batch'

const rep = (o: Partial<Report>): Report => ({ mode: 'simulation', lignes: 0, colonnesIgnorees: [], aCreer: [], doublons: [], erreurs: [], ...o })

describe('import par lots', () => {
  it('compte les lignes de données', () => {
    expect(csvDataRows('nom;ville\nA;Alger\r\nB;Oran\n\n')).toBe(2)
    expect(csvDataRows('nom;presentation\nA;"ligne 1\nligne 2"\nB;x')).toBe(2)
    expect(csvDataRows('nom\n')).toBe(0)
    expect(csvDataRows('')).toBe(0)
  })
  it('suite absente = terminé', () => {
    expect(hasMore(undefined)).toBe(false)
    expect(hasMore(null)).toBe(false)
    expect(hasMore(150)).toBe(true)
    expect(hasMore({ depart: 150 })).toBe(true)
    expect(hasMore('abc')).toBe(true)
  })
  it('progression bornée', () => {
    expect(progress(150, 300, 150)).toBe(50)
    expect(progress(150, 300, { depart: 150, total: 600 })).toBe(25)
    expect(progress(300, 300, 'x')).toBe(99)
    expect(progress(300, 300, undefined)).toBe(100)
    expect(progress(0, 0, undefined)).toBe(100)
  })
  it('cumule les rapports', () => {
    const a = rep({ lignes: 150, colonnesIgnorees: ['x'], aCreer: [{ line: 2, name: 'A', city: 'Alger', category: 'Cafés' }], suite: 150 })
    const b = rep({ lignes: 20, colonnesIgnorees: ['x', 'y'], erreurs: [{ line: 160, errors: ['nom manquant'] }] })
    const m = mergeReports(mergeReports(null, a), b)
    expect(m).toMatchObject({ lignes: 170, colonnesIgnorees: ['x', 'y'] })
    expect(m.aCreer).toHaveLength(1)
    expect(m.erreurs).toHaveLength(1)
    expect(m.crees).toBeUndefined()
    expect(mergeReports(rep({ mode: 'confirme', crees: [{ line: 2, id: 1, name: 'A' }] }), rep({ mode: 'confirme', crees: [{ line: 3, id: 2, name: 'B' }] })).crees).toHaveLength(2)
  })
  it('borne le nombre d’appels', () => {
    expect(maxCalls(300)).toBe(4)
    expect(maxCalls(0)).toBe(3)
  })
})
