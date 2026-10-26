/**
 * Disponibilités d’un prestataire (sans dépendance, testé) : à partir de ses plages hebdomadaires,
 * heures de début possibles pour une mission d’une durée donnée. Heures saisies en heure d’Alger (UTC+1, sans heure d’été).
 */
export const ALGIERS_OFFSET_MIN = 60
export const STEP_MIN = 30

export type Rule = { day: number | string; start: string; end: string }
export type Agenda = {
  minNoticeHours?: number | null
  horizonDays?: number | null
  weekly?: Rule[] | null
  closures?: { from: string; to: string }[] | null
}
export type Busy = { start: string; end: string }

const toMin = (hhmm: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm).trim())
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN
}
export const algiersDate = (d: Date) => new Date(d.getTime() + ALGIERS_OFFSET_MIN * 60000).toISOString().slice(0, 10)
const instant = (date: string, minutes: number) => new Date(Date.parse(`${date}T00:00:00Z`) + (minutes - ALGIERS_OFFSET_MIN) * 60000)
export const addDays = (date: string, n: number) => new Date(Date.parse(`${date}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10)

/** Heures de début possibles (ISO) pour une mission de `durationMin` minutes, un jour donné. */
export function startTimes(agenda: Agenda, date: string, durationMin: number, busy: Busy[], now: Date): string[] {
  const duration = Math.max(STEP_MIN, Math.min(12 * 60, Math.round(durationMin)))
  const notice = now.getTime() + (agenda.minNoticeHours ?? 12) * 3600e3
  const horizon = Date.parse(`${addDays(algiersDate(now), agenda.horizonDays ?? 60)}T23:59:59Z`)
  if (Date.parse(`${date}T00:00:00Z`) > horizon) return []
  if ((agenda.closures ?? []).some((c) => c.from && c.to && date >= c.from.slice(0, 10) && date <= c.to.slice(0, 10))) return []
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay()
  const taken = busy.map((b) => [Date.parse(b.start), Date.parse(b.end)] as const)
  const out = new Set<string>()
  for (const rule of agenda.weekly ?? []) {
    if (Number(rule.day) !== weekday) continue
    const from = toMin(rule.start)
    const to = toMin(rule.end)
    if (!(from < to)) continue
    for (let m = from; m + duration <= to; m += STEP_MIN) {
      const s = instant(date, m).getTime()
      const e = s + duration * 60000
      if (s < notice) continue
      if (taken.some(([bs, be]) => s < be && bs < e)) continue
      out.add(new Date(s).toISOString())
    }
  }
  return [...out].sort()
}

/** Jours (à partir d’une date d’Alger) qui ont au moins une heure de début possible. */
export function openDays(agenda: Agenda, fromDate: string, days: number, durationMin: number, busy: Busy[], now = new Date()) {
  return Array.from({ length: days }, (_, i) => addDays(fromDate, i)).map((date) => ({ date, starts: startTimes(agenda, date, durationMin, busy, now) }))
}

/** La mission demandée tient-elle réellement dans l’agenda du prestataire ? */
export function isRequestable(agenda: Agenda, start: string, durationMin: number, busy: Busy[], now = new Date()) {
  const iso = new Date(start).toISOString()
  return startTimes(agenda, algiersDate(new Date(start)), durationMin, busy, now).includes(iso)
}

export const algiersTime = (iso: string) => new Date(Date.parse(iso) + ALGIERS_OFFSET_MIN * 60000).toISOString().slice(11, 16)
export const algiersLongDate = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Algiers' }).format(new Date(iso))
