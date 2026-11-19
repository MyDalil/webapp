import { describe, expect, it } from 'vitest'
import { liftSponsored, requestedPeriod, selectSponsored, sponsoredLabel, type Sponsorship } from './sponsoringCore'

const now = new Date('2026-11-19T12:00:00Z')
const s = (o: Partial<Sponsorship>): Sponsorship => ({ id: 1, targetCollection: 'places', targetId: 1, kind: 'remontee', status: 'active', startsAt: '2026-11-01T00:00:00Z', endsAt: '2026-12-01T00:00:00Z', ...o })

describe('selectSponsored', () => {
  it('garde seulement les sponsorisations actives et en cours', () => {
    const list = [
      s({ id: 1, targetId: 1 }),
      s({ id: 2, targetId: 2, status: 'demande' }),
      s({ id: 3, targetId: 3, status: 'refusee' }),
      s({ id: 4, targetId: 4, startsAt: '2026-11-20T00:00:00Z' }),
      s({ id: 5, targetId: 5, endsAt: '2026-11-19T11:59:59Z' }),
      s({ id: 6, targetId: 6, startsAt: null }),
    ]
    expect(selectSponsored(list, { now }).map((x) => x.id)).toEqual([1])
  })
  it('respecte la wilaya : nationale partout, locale seulement chez elle', () => {
    const list = [s({ id: 1, targetId: 1, wilaya: '16' }), s({ id: 2, targetId: 2, wilaya: null }), s({ id: 3, targetId: 3, wilaya: '31' })]
    expect(selectSponsored(list, { now, wilaya: '16' }).map((x) => x.id)).toEqual([1, 2])
    expect(selectSponsored(list, { now }).map((x) => x.id)).toEqual([2])
    expect(selectSponsored(list, { now, wilaya: 31 }).map((x) => x.id)).toEqual([3, 2])
  })
  it('plafonne à 2, même si on en demande plus, et filtre la collection', () => {
    const list = [1, 2, 3, 4].map((i) => s({ id: i, targetId: i }))
    expect(selectSponsored(list, { now, max: 10 })).toHaveLength(2)
    expect(selectSponsored([...list, s({ id: 9, targetId: 9, targetCollection: 'providers' })], { now, collection: 'providers' }).map((x) => x.id)).toEqual([9])
  })
  it('« À la une » passe avant « Remontée », une fiche une seule fois', () => {
    const list = [s({ id: 1, targetId: 1, kind: 'remontee' }), s({ id: 2, targetId: 2, kind: 'a-la-une' }), s({ id: 3, targetId: 2, kind: 'partenaire' })]
    expect(selectSponsored(list, { now }).map((x) => x.id)).toEqual([2, 1])
  })
})

describe('liftSponsored', () => {
  const hits = [
    { type: 'adresse', id: '10', title: 'A' },
    { type: 'adresse', id: '11', title: 'B' },
    { type: 'adresse', id: '12', title: 'C' },
    { type: 'adresse', id: '13', title: 'D' },
  ]
  const key = (h: { id: string }) => ({ collection: 'places' as const, id: h.id })
  it('marque au plus 2 résultats sponsorisés et garde l’ordre du reste', () => {
    const active = [s({ targetId: 13 }), s({ targetId: 11, kind: 'a-la-une' }), s({ targetId: 12 })]
    const r = liftSponsored(hits, active, key)
    expect(r.sponsored.map((h) => [h.id, h.sponsored])).toEqual([
      ['11', true],
      ['12', true],
    ])
    expect(r.rest.map((h) => h.id)).toEqual(['10', '13'])
    expect(r.rest.every((h) => !('sponsored' in h))).toBe(true)
  })
  it('sans sponsorisation, rien ne change', () => {
    expect(liftSponsored(hits, [], key)).toEqual({ sponsored: [], rest: hits })
  })
})

describe('libellé', () => {
  it('« Sponsorisé » dans les trois langues', () => {
    expect(sponsoredLabel('fr')).toBe('Sponsorisé')
    expect(sponsoredLabel('en')).toBe('Sponsored')
    expect(sponsoredLabel('ar')).toBe('مُموَّل')
    expect(sponsoredLabel(undefined)).toBe('Sponsorisé')
  })
})

describe('requestedPeriod', () => {
  it('début jamais dans le passé, 1 à 12 mois', () => {
    expect(requestedPeriod({ startsAt: '2020-01-01', months: 2 }, now)).toEqual({ startsAt: '2026-11-19T12:00:00.000Z', endsAt: '2027-01-19T12:00:00.000Z' })
    expect(requestedPeriod({ months: 99 }, now).endsAt).toBe('2027-11-19T12:00:00.000Z')
  })
})
