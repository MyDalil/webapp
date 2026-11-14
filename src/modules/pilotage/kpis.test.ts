import { describe, expect, it } from 'vitest'
import { getBadges, getPilotageKpis, type Deps } from './kpis'

const NOW = new Date('2026-11-14T12:00:00Z')
const zero: Deps = { count: async () => 0, sum: async () => 0 }

describe('indicateurs du Pilotage', () => {
  it('base vide : 8 indicateurs à zéro', async () => {
    const k = await getPilotageKpis(zero, NOW)
    expect(k).toHaveLength(8)
    expect(k.every((x) => x.value === 0)).toBe(true)
  })

  it('une source en erreur donne null, les autres restent', async () => {
    const deps: Deps = { count: async () => 3, sum: async () => { throw new Error('panne') } }
    const k = await getPilotageKpis(deps, NOW)
    expect(k.find((x) => x.key === 'coutIa')?.value).toBeNull()
    expect(k.filter((x) => x.value === 3)).toHaveLength(7)
  })

  it('les visiteurs sont comptés sur les dernières 24 h', async () => {
    const seen: unknown[] = []
    await getPilotageKpis({ count: async (c, w) => { if (c === 'visitor-sessions') seen.push(w); return 0 }, sum: async () => 0 }, NOW)
    expect(seen[0]).toEqual({ createdAt: { greater_than: '2026-11-13T12:00:00.000Z' } })
  })

  it('le coût IA est la somme du mois en cours, convertie en dollars', async () => {
    let where: unknown
    const k = await getPilotageKpis({ count: async () => 0, sum: async (_c, _f, w) => { where = w; return 18_400_000 } }, NOW)
    expect(where).toEqual({ createdAt: { greater_than_equal: '2026-11-01T00:00:00.000Z' } })
    expect(k.find((x) => x.key === 'coutIa')?.value).toBe(18.4)
  })

  it('fiches à vérifier = repérées + en cours', async () => {
    let where: unknown
    await getPilotageKpis({ count: async (c, w) => { if (c === 'places' && JSON.stringify(w).includes('verification')) where = w; return 0 }, sum: async () => 0 }, NOW)
    expect(where).toEqual({ verification: { in: ['spotted', 'checking'] } })
  })

  it('badges du menu', async () => {
    const b = await getBadges({ count: async (c) => (c === 'agent-tasks' ? 2 : 1), sum: async () => 0 })
    expect(b).toEqual({ validation: 2, taches: 2, contributions: 1, inbox: 1, annonces: 1, moderation: 1, pros: 1 })
  })
})
