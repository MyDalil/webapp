import { describe, expect, it } from 'vitest'
import { agendaLinks, agendaToken, icsCalendar, validAgendaToken } from './calendar'
describe('agenda', () => {
  it('ics valide', () => {
    const s = icsCalendar([{ uid: 'rdv-1', start: '2026-12-01T09:00:00Z', end: '2026-12-01T09:30:00Z', summary: 'Rendez-vous — Dr Démo, test; virgule', location: 'Alger', description: 'Ligne 1\nLigne 2' }])
    expect(s).toContain('DTSTART:20261201T090000Z')
    expect(s.replace(/\r\n /g, '')).toContain('SUMMARY:Rendez-vous — Dr Démo\\, test\\; virgule')
    expect(s.split('\r\n').every((l) => Buffer.byteLength(l) <= 75)).toBe(true)
  })
  it('jeton', () => {
    process.env.PAYLOAD_SECRET = 'x'
    expect(validAgendaToken(5, agendaToken(5))).toBe(true)
    expect(validAgendaToken(6, agendaToken(5))).toBe(false)
    expect(agendaLinks('https://www.mydalil.com', 5).apple.startsWith('webcal://www.mydalil.com/api/agenda/5/')).toBe(true)
  })
})
