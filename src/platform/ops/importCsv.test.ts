import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('./context', async () => {
  class OpsError extends Error {}
  return { OpsError, requireRole: () => {}, staffReq: async () => ({ context: {} }) }
})

const { importCsv } = await import('./importCsv')
const ctx = { principal: { kind: 'staff', userId: 1, role: 'admin', name: 'Test' }, channel: 'admin', actionId: 'a', lang: 'fr' } as never
const head = 'nom;secteur;categorie;wilaya;commune;telephone\n'
const csv = head + Array.from({ length: 160 }, (_, i) => `Lieu ${i + 1};restaurants-gastronomie;Cafés;16;Alger;05500${String(i + 1).padStart(5, '0')}`).join('\n')

describe('importCsv par lots', () => {
  it('simulation : un lot de 150, suite = 150, aucune écriture, requête ciblée sur le lot seulement', async () => {
    const create = vi.fn()
    const findKnown = vi.fn(async () => [])
    const r = await importCsv({ create } as never, { collection: 'places', csv }, ctx, findKnown)
    expect(r).toMatchObject({ mode: 'simulation', lignes: 160, lot: { debut: 0, fin: 150 }, suite: 150 })
    expect(r.aCreer).toHaveLength(150)
    expect(findKnown).toHaveBeenCalledOnce()
    expect((findKnown.mock.calls[0] as unknown[])[0]).toHaveLength(150)
    expect(create).not.toHaveBeenCalled()
  })
  it('confirmation du dernier lot : brouillons seulement, doublons de la base ignorés (relance sûre)', async () => {
    const create = vi.fn(async (a: { data: { name: string } }) => ({ id: a.data.name }))
    const findKnown = vi.fn(async () => [{ id: 77, name: 'Lieu 151', city: 'Alger', phone: '+213 550 000 151' }])
    const r = await importCsv({ create } as never, { collection: 'places', csv, confirmer: true, depuis: 150 }, ctx, findKnown)
    expect(r.suite).toBeNull()
    expect(r.doublons).toMatchObject([{ line: 152, existing: { id: 77 } }])
    expect(r.crees).toHaveLength(9)
    for (const [a] of create.mock.calls as unknown as [{ draft: boolean; data: { _status: string; verification: string } }][]) {
      expect(a.draft).toBe(true)
      expect(a.data).toMatchObject({ _status: 'draft', verification: 'spotted' })
    }
  })
  it('refuse un fichier de plus de 1 Mo et une reprise hors du fichier', async () => {
    await expect(importCsv({} as never, { collection: 'places', csv: 'x'.repeat(1024 * 1024 + 1) }, ctx, async () => [])).rejects.toThrow('1 Mo')
    await expect(importCsv({} as never, { collection: 'places', csv, depuis: 500 }, ctx, async () => [])).rejects.toThrow('Reprise invalide')
  })
})
