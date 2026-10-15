/**
 * Moteur de disponibilités (sans dépendance, testé) : transforme l’agenda hebdomadaire d’un praticien
 * en créneaux libres. Toutes les heures saisies sont en heure d’Alger (UTC+1, sans heure d’été).
 */
export const ALGIERS_OFFSET_MIN = 60

export type Mode = 'cabinet' | 'visio'
export type WeeklyRule = { day: number | string; start: string; end: string; mode?: 'both' | Mode | null }
export type Closure = { from: string; to: string }
export type Agenda = {
  slotMinutes?: number | null
  minNoticeHours?: number | null
  horizonDays?: number | null
  weekly?: WeeklyRule[] | null
  closures?: Closure[] | null
}
export type Slot = { start: string; end: string; modes: Mode[] }

const toMin = (hhmm: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN
}

/** Date (AAAA-MM-JJ) en heure d’Alger pour un instant donné. */
export const algiersDate = (d: Date) => new Date(d.getTime() + ALGIERS_OFFSET_MIN * 60000).toISOString().slice(0, 10)

/** Instant UTC correspondant à une date d’Alger + minutes depuis minuit (heure d’Alger). */
const instant = (date: string, minutes: number) => new Date(Date.parse(`${date}T00:00:00Z`) + (minutes - ALGIERS_OFFSET_MIN) * 60000)

const addDays = (date: string, n: number) => new Date(Date.parse(`${date}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10)

export function slotsForDay(agenda: Agenda, date: string, taken: Set<string>, now: Date): Slot[] {
  const step = Math.max(10, Math.min(240, agenda.slotMinutes ?? 30))
  const notice = now.getTime() + (agenda.minNoticeHours ?? 2) * 3600e3
  const horizon = Date.parse(`${addDays(algiersDate(now), agenda.horizonDays ?? 60)}T23:59:59Z`)
  if (Date.parse(`${date}T00:00:00Z`) > horizon) return []
  if ((agenda.closures ?? []).some((c) => c.from && c.to && date >= c.from.slice(0, 10) && date <= c.to.slice(0, 10))) return []
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay()
  const byStart = new Map<string, Slot>()
  for (const rule of agenda.weekly ?? []) {
    if (Number(rule.day) !== weekday) continue
    const from = toMin(rule.start)
    const to = toMin(rule.end)
    if (!(from < to)) continue
    const modes: Mode[] = !rule.mode || rule.mode === 'both' ? ['cabinet', 'visio'] : [rule.mode]
    for (let m = from; m + step <= to; m += step) {
      const start = instant(date, m)
      if (start.getTime() < notice) continue
      const key = start.toISOString()
      if (taken.has(key)) continue
      const existing = byStart.get(key)
      if (existing) existing.modes = [...new Set([...existing.modes, ...modes])]
      else byStart.set(key, { start: key, end: new Date(start.getTime() + step * 60000).toISOString(), modes })
    }
  }
  return [...byStart.values()].sort((a, b) => a.start.localeCompare(b.start))
}

/** Créneaux libres sur plusieurs jours à partir d’une date d’Alger. */
export function slotsBetween(agenda: Agenda, fromDate: string, days: number, taken: Iterable<string>, now = new Date(), mode?: Mode) {
  const set = new Set(taken)
  const out: { date: string; slots: Slot[] }[] = []
  for (let i = 0; i < days; i++) {
    const date = addDays(fromDate, i)
    const slots = slotsForDay(agenda, date, set, now).filter((s) => !mode || s.modes.includes(mode))
    out.push({ date, slots })
  }
  return out
}

/** Le créneau demandé existe-t-il réellement dans l’agenda (et est-il libre) ? */
export function isBookable(agenda: Agenda, start: string, mode: Mode, taken: Iterable<string>, now = new Date()) {
  const date = algiersDate(new Date(start))
  return slotsForDay(agenda, date, new Set(taken), now).some((s) => s.start === new Date(start).toISOString() && s.modes.includes(mode))
}

/** Heure lisible à Alger : « 09:30 ». */
export const algiersTime = (iso: string) => new Date(Date.parse(iso) + ALGIERS_OFFSET_MIN * 60000).toISOString().slice(11, 16)

export const algiersLongDate = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Algiers' }).format(new Date(iso))
