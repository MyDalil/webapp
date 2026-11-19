import { describe, expect, it, vi } from 'vitest'
import { dailyTranslateMax, translateMissing } from './backfill'
import { sourceHash } from './core'

/** Base factice : `docs` par collection (publiées), traductions à jour pour `done`. */
function fakePayload(docs: Record<string, Record<string, unknown>[]>, done: string[] = []) {
  return {
    find: vi.fn(async (a: { collection: string; page?: number; limit?: number; where: Record<string, unknown> }) => {
      if (a.collection === 'translations') {
        const rows = done.flatMap((key) => {
          const [c, id] = key.split('/')
          const d = docs[c].find((x) => String(x.id) === id)!
          return ['en', 'ar'].map((lang) => ({ collection: c, docId: id, field: 'intro', lang, text: 't', sourceHash: sourceHash(String(d.intro)) }))
        })
        return { docs: rows }
      }
      const all = docs[a.collection] ?? []
      const page = a.page ?? 1
      const slice = all.slice((page - 1) * (a.limit ?? 200), page * (a.limit ?? 200))
      return { docs: slice, hasNextPage: page * (a.limit ?? 200) < all.length }
    }),
  }
}
const places = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, intro: `Texte ${i + 1}`, slug: `p${i + 1}` }))

describe('translateMissing', () => {
  it('TRANSLATE_DAILY_MAX : défaut 50, valeur entière sinon', () => {
    expect(dailyTranslateMax(undefined)).toBe(50)
    expect(dailyTranslateMax('7')).toBe(7)
    expect(dailyTranslateMax('abc')).toBe(50)
  })
  it('ne traduit que les fiches publiées sans traduction à jour, au plus N, puis s’arrête proprement', async () => {
    const p = fakePayload({ places }, ['places/1'])
    const translate = vi.fn(async (_p: unknown, collection: string, id: string | number) => ({ collection, id: String(id), traduits: [{ field: 'intro', lang: 'en' as const }], inchanges: 0 }))
    const r = await translateMissing(p as never, { max: 2, translate })
    expect(translate.mock.calls.map((c) => c[2])).toEqual([2, 3])
    expect(r.arret).toBe('plafond-de-la-passe')
    expect(r.traduites).toHaveLength(2)
    expect(p.find.mock.calls[0][0]).toMatchObject({ collection: 'places', where: { _status: { equals: 'published' } } })
  })
  it('arrêt au plafond mensuel de l’IA ; rien à faire → aucun appel', async () => {
    const translate = vi.fn(async () => ({ collection: 'places', id: '1', traduits: [], inchanges: 0, arret: 'plafond-atteint' as const }))
    const r = await translateMissing(fakePayload({ places }) as never, { max: 50, translate })
    expect(translate).toHaveBeenCalledOnce()
    expect(r.arret).toBe('plafond-atteint')
    const none = vi.fn()
    const r2 = await translateMissing(fakePayload({ places: places.slice(0, 1) }, ['places/1']) as never, { max: 50, translate: none })
    expect(none).not.toHaveBeenCalled()
    expect(r2.arret).toBeUndefined()
  })
  it('budget de temps épuisé : arrêt sans appel', async () => {
    let t = 0
    const translate = vi.fn()
    const r = await translateMissing(fakePayload({ places }) as never, { max: 50, translate, budgetMs: 10, now: () => (t += 20) })
    expect(translate).not.toHaveBeenCalled()
    expect(r.arret).toBe('temps-ecoule')
  })
})
