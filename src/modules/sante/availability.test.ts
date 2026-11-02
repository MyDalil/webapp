import { describe, expect, it } from 'vitest'
import { isBookable, slotsBetween, slotsForDay, algiersTime } from './availability'

// Lundi 19 octobre 2026 (Alger), 09:00–12:00 cabinet, 14:00–16:00 visio, créneaux de 30 min.
const agenda = {
  slotMinutes: 30,
  minNoticeHours: 2,
  horizonDays: 30,
  weekly: [
    { day: 1, start: '09:00', end: '12:00', mode: 'cabinet' as const },
    { day: 1, start: '14:00', end: '16:00', mode: 'visio' as const },
  ],
  closures: [{ from: '2026-10-26', to: '2026-10-27' }],
}
const now = new Date('2026-10-16T08:00:00Z')

describe('disponibilités', () => {
  it('découpe les plages en créneaux, en heure d’Alger', () => {
    const s = slotsForDay(agenda, '2026-10-19', new Set(), now)
    expect(s).toHaveLength(10)
    expect(algiersTime(s[0].start)).toBe('09:00')
    expect(s[0].start).toBe('2026-10-19T08:00:00.000Z')
    expect(s[0].modes).toEqual(['cabinet'])
    expect(algiersTime(s[6].start)).toBe('14:00')
    expect(s[6].modes).toEqual(['visio'])
  })
  it('retire les créneaux pris', () => {
    const s = slotsForDay(agenda, '2026-10-19', new Set(['2026-10-19T08:00:00.000Z']), now)
    expect(s).toHaveLength(9)
  })
  it('respecte le délai de prévenance', () => {
    const tight = new Date('2026-10-19T08:30:00Z') // 09:30 à Alger : prochain créneau ≥ 11:30
    const s = slotsForDay(agenda, '2026-10-19', new Set(), tight)
    expect(algiersTime(s[0].start)).toBe('11:30')
  })
  it('ferme les jours de congé et au-delà de l’horizon', () => {
    expect(slotsForDay(agenda, '2026-10-26', new Set(), now)).toHaveLength(0)
    expect(slotsForDay(agenda, '2026-12-21', new Set(), now)).toHaveLength(0)
  })
  it('filtre par mode sur plusieurs jours', () => {
    const days = slotsBetween(agenda, '2026-10-18', 3, [], now, 'visio')
    expect(days.map((d) => d.slots.length)).toEqual([0, 4, 0])
  })
  it('refuse un créneau inventé ou au mauvais mode', () => {
    expect(isBookable(agenda, '2026-10-19T08:00:00.000Z', 'cabinet', [], now)).toBe(true)
    expect(isBookable(agenda, '2026-10-19T08:10:00.000Z', 'cabinet', [], now)).toBe(false)
    expect(isBookable(agenda, '2026-10-19T08:00:00.000Z', 'visio', [], now)).toBe(false)
  })
})

describe('A11 — aucun chevauchement de rendez-vous', () => {
  // Lundi 19 octobre 2026, deux plages superposées 09:00-10:00 et 09:15-10:15 (heure d’Alger), créneaux de 30 min.
  const overlapping = { slotMinutes: 30, minNoticeHours: 0, horizonDays: 60, weekly: [{ day: 1, start: '09:00', end: '10:00' }, { day: 1, start: '09:15', end: '10:15' }] }
  const now = new Date('2026-10-18T08:00:00Z')
  it('plages fusionnées : aucun créneau doublon', () => {
    const s = slotsForDay(overlapping, '2026-10-19', [], now).map((x) => algiersTime(x.start))
    expect(s).toEqual(['09:00', '09:30'])
  })
  it('09:15 n’est plus proposé après une réservation 09:00-09:30', () => {
    const busy = [{ start: '2026-10-19T08:00:00.000Z', end: '2026-10-19T08:30:00.000Z' }]
    const s = slotsForDay(overlapping, '2026-10-19', busy, now).map((x) => algiersTime(x.start))
    expect(s).not.toContain('09:00')
    expect(s).not.toContain('09:15')
    expect(isBookable(overlapping, '2026-10-19T08:15:00.000Z', 'cabinet', busy, now)).toBe(false)
  })
  it('changement de durée : un ancien rendez-vous de 60 min bloque deux créneaux de 30 min', () => {
    const busy = [{ start: '2026-10-19T08:00:00.000Z', end: '2026-10-19T09:00:00.000Z' }]
    const s = slotsForDay(overlapping, '2026-10-19', busy, now).map((x) => algiersTime(x.start))
    expect(s).toEqual([])
  })
})
