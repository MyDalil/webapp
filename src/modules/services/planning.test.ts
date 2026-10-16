import { describe, expect, it } from 'vitest'
import { algiersTime, isRequestable, openDays, startTimes } from './planning'

// Lundi 19 octobre 2026 (Alger) : 09:00–13:00 et 15:00–18:00.
const agenda = {
  minNoticeHours: 12,
  horizonDays: 30,
  weekly: [
    { day: 1, start: '09:00', end: '13:00' },
    { day: 1, start: '15:00', end: '18:00' },
  ],
  closures: [{ from: '2026-10-26', to: '2026-10-26' }],
}
const now = new Date('2026-10-16T08:00:00Z')

describe('startTimes', () => {
  it('ne propose que des débuts où la mission tient entière dans une plage', () => {
    const t = startTimes(agenda, '2026-10-19', 180, [], now).map(algiersTime)
    expect(t).toEqual(['09:00', '09:30', '10:00', '15:00'])
  })
  it('écarte les débuts qui chevauchent une mission acceptée', () => {
    const busy = [{ start: '2026-10-19T09:00:00.000Z', end: '2026-10-19T10:00:00.000Z' }] // 10:00–11:00 Alger
    const t = startTimes(agenda, '2026-10-19', 60, busy, now).map(algiersTime)
    expect(t).toEqual(['09:00', '11:00', '11:30', '12:00', '15:00', '15:30', '16:00', '16:30', '17:00'])
  })
  it('respecte le délai minimum, les congés et l’horizon', () => {
    expect(startTimes(agenda, '2026-10-19', 60, [], new Date('2026-10-18T22:00:00Z')).map(algiersTime)[0]).toBe('11:00')
    expect(startTimes(agenda, '2026-10-26', 60, [], now)).toEqual([])
    expect(startTimes(agenda, '2026-12-28', 60, [], now)).toEqual([])
  })
})

describe('isRequestable / openDays', () => {
  it('valide uniquement un début réellement proposé', () => {
    expect(isRequestable(agenda, '2026-10-19T08:00:00.000Z', 120, [], now)).toBe(true)
    expect(isRequestable(agenda, '2026-10-19T11:30:00.000Z', 120, [], now)).toBe(false)
  })
  it('liste les jours ouverts', () => {
    const d = openDays(agenda, '2026-10-17', 3, 60, [], now)
    expect(d.map((x) => x.starts.length > 0)).toEqual([false, false, true])
  })
})
