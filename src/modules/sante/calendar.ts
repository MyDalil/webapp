import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Calendrier : format iCalendar (RFC 5545), lu par Google Agenda, Apple Calendrier et Outlook.
 * - Fichier .ics joint à chaque email de rendez-vous et téléchargeable depuis le compte.
 * - Abonnement du praticien : lien secret propre à chaque praticien, mis à jour automatiquement par l’agenda abonné.
 * Aucune synchronisation dans l’autre sens pour l’instant (Google impose une vérification de l’application).
 */
export type CalEvent = { uid: string; start: string; end: string; summary: string; location?: string | null; description?: string | null; url?: string | null; cancelled?: boolean }

const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const text = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (c) => `\\${c}`)
/** Lignes de 75 octets au plus (RFC 5545 §3.1). */
const fold = (line: string) => {
  const out: string[] = []
  let rest = line
  while (Buffer.byteLength(rest) > 75) {
    let n = 75
    while (Buffer.byteLength(rest.slice(0, n)) > 75) n--
    out.push(rest.slice(0, n))
    rest = ` ${rest.slice(n)}`
  }
  out.push(rest)
  return out.join('\r\n')
}

export function icsCalendar(events: CalEvent[], name = 'DALIL — rendez-vous'): string {
  const now = stamp(new Date().toISOString())
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//DALIL//Rendez-vous//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${text(name)}`, 'X-WR-TIMEZONE:Africa/Algiers', 'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H']
  for (const e of events) {
    lines.push('BEGIN:VEVENT', `UID:${e.uid}@mydalil.com`, `DTSTAMP:${now}`, `DTSTART:${stamp(e.start)}`, `DTEND:${stamp(e.end)}`, `SUMMARY:${text(e.summary)}`)
    if (e.location) lines.push(`LOCATION:${text(e.location)}`)
    if (e.description) lines.push(`DESCRIPTION:${text(e.description)}`)
    if (e.url) lines.push(`URL:${e.url}`)
    lines.push(`STATUS:${e.cancelled ? 'CANCELLED' : 'CONFIRMED'}`)
    if (!e.cancelled) lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Rendez-vous DALIL', 'TRIGGER:-PT1H', 'END:VALARM')
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return `${lines.map(fold).join('\r\n')}\r\n`
}

const secret = () => process.env.PAYLOAD_SECRET ?? ''

/** Jeton secret du lien d’abonnement d’un praticien (stable, sans stockage). */
export const agendaToken = (practitionerId: number | string) => createHmac('sha256', `agenda:${secret()}`).update(String(practitionerId)).digest('base64url').slice(0, 32)

export function validAgendaToken(practitionerId: number | string, token: string) {
  if (!secret()) return false
  const a = Buffer.from(agendaToken(practitionerId))
  const b = Buffer.from(token)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Liens d’abonnement prêts à l’emploi pour les trois agendas courants. */
export function agendaLinks(site: string, practitionerId: number | string) {
  const feed = `${site}/api/agenda/${practitionerId}/${agendaToken(practitionerId)}.ics`
  const webcal = feed.replace(/^https?:/, 'webcal:')
  return {
    feed,
    google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`,
    apple: webcal,
    outlook: `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(feed)}&name=${encodeURIComponent('DALIL — rendez-vous')}`,
  }
}
