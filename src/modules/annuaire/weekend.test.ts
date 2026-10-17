import { describe, expect, it } from 'vitest'
import { selectWeekend, weekendWindow, type WeekendEvent, type WeekendPlace } from './weekend'

// Mercredi 21 octobre 2026, 10:00 à Alger (UTC+1). Le week-end algérien : vendredi 23 et samedi 24.
const now = new Date('2026-10-21T09:00:00Z')

const ev = (o: Partial<WeekendEvent> & Pick<WeekendEvent, 'slug' | 'startsAt'>): WeekendEvent => ({
  title: o.slug, type: 'culture', endsAt: null, wilaya: 16, city: 'Alger', free: false, priceMin: null, family: false, accessible: 'unknown', status: 'confirmed', ...o,
})
const events: WeekendEvent[] = [
  ev({ slug: 'concert-alger', startsAt: '2026-10-23T17:00:00Z', free: true, family: true }),
  ev({ slug: 'salon-oran', startsAt: '2026-10-24T09:00:00Z', wilaya: 31, city: 'Oran', priceMin: 2000, status: 'incomplete' }),
  ev({ slug: 'expo-terminee', startsAt: '2026-10-20T09:00:00Z' }),
  ev({ slug: 'semaine-prochaine', startsAt: '2026-10-30T17:00:00Z' }),
  ev({ slug: 'festival-constantine', type: 'festival', startsAt: '2026-10-19T09:00:00Z', endsAt: '2026-10-25T20:00:00Z', wilaya: 25, city: 'Constantine' }),
]
const pl = (slug: string, category: string, wilaya: string): WeekendPlace => ({ slug, name: slug, category, wilaya })
const places = [pl('jardin-essai', 'Jardins', 'Alger'), pl('bardo', 'Musées', 'Alger'), pl('santa-cruz', 'Monuments et sites historiques', 'Oran'), pl('banque', 'Banques', 'Alger')]
const slugs = (l: { slug: string }[]) => l.map((x) => x.slug)

describe('fenêtre du week-end', () => {
  it('un mercredi, le week-end va du vendredi 0 h au samedi 23 h 59 (heure d’Alger)', () => {
    const w = weekendWindow(now, 'weekend')
    expect(w.from.toISOString()).toBe('2026-10-22T23:00:00.000Z')
    expect(w.to.toISOString()).toBe('2026-10-24T22:59:59.999Z')
  })
  it('un samedi, le week-end commence maintenant', () => {
    const saturday = new Date('2026-10-24T14:00:00Z')
    const w = weekendWindow(saturday, 'weekend')
    expect(w.from.toISOString()).toBe(saturday.toISOString())
    expect(w.to.toISOString()).toBe('2026-10-24T22:59:59.999Z')
  })
})

describe('sélection « Que faire ce week-end ? »', () => {
  it('sépare les événements confirmés des informations incomplètes, par date de début', () => {
    const r = selectWeekend({ events, places, filters: {}, now })
    expect(slugs(r.confirmed)).toEqual(['festival-constantine', 'concert-alger'])
    expect(slugs(r.incomplete)).toEqual(['salon-oran'])
  })
  it('n’affiche jamais un événement terminé, même sur toutes les dates', () => {
    const r = selectWeekend({ events, places, filters: { when: 'all' }, now })
    expect(slugs([...r.confirmed, ...r.incomplete])).not.toContain('expo-terminee')
    expect(slugs(r.confirmed)).toContain('semaine-prochaine')
  })
  it('gratuit : seulement les événements dont la gratuité est connue', () => {
    expect(slugs(selectWeekend({ events, places, filters: { budget: 'free' }, now }).confirmed)).toEqual(['concert-alger'])
  })
  it('budget plafonné : un prix inconnu n’est pas promis', () => {
    const r = selectWeekend({ events, places, filters: { budget: '3000' }, now })
    expect(slugs(r.confirmed)).toEqual(['concert-alger'])
    expect(slugs(r.incomplete)).toEqual(['salon-oran'])
  })
  it('en famille et accessibilité : seulement ce qui est indiqué', () => {
    expect(slugs(selectWeekend({ events, places, filters: { family: true }, now }).confirmed)).toEqual(['concert-alger'])
    expect(slugs(selectWeekend({ events, places, filters: { accessible: true }, now }).confirmed)).toEqual([])
  })
  it('wilaya et distance depuis la wilaya choisie', () => {
    expect(slugs(selectWeekend({ events, places, filters: { wilaya: 16, distance: 'wilaya' }, now }).confirmed)).toEqual(['concert-alger'])
    const near = selectWeekend({ events, places, filters: { wilaya: 16, distance: '100' }, now })
    expect(slugs([...near.confirmed, ...near.incomplete])).toEqual(['concert-alger'])
  })
  it('type d’activité', () => {
    expect(slugs(selectWeekend({ events, places, filters: { type: 'festival' }, now }).confirmed)).toEqual(['festival-constantine'])
  })
  it('propose des lieux à visiter, sans les promettre quand un filtre exige une information vérifiée', () => {
    const r = selectWeekend({ events, places, filters: { wilaya: 16, distance: 'wilaya' }, now })
    expect(slugs(r.places)).toEqual(['jardin-essai', 'bardo'])
    const f = selectWeekend({ events, places, filters: { family: true }, now })
    expect(f.places).toEqual([])
    expect(f.placesHidden).toBe(true)
  })
})
