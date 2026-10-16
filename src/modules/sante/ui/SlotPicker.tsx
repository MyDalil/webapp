'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SmartText } from '@/platform/ui/SmartText'

type Mode = 'cabinet' | 'visio'
type Day = { date: string; slots: { start: string; modes: Mode[] }[] }

const TZ = 'Africa/Algiers'
const dayLabel = (d: string) => {
  const date = new Date(`${d}T12:00:00Z`)
  return {
    wd: new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: TZ }).format(date).replace('.', ''),
    dm: new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: TZ }).format(date).replace('.', ''),
  }
}
const hour = (iso: string) => new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: TZ }).format(new Date(iso))
const longDate = (iso: string) => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ }).format(new Date(iso))
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10)
const todayAlgiers = () => new Date(Date.now() + 3600e3).toISOString().slice(0, 10)

/** Prise de rendez-vous façon Doctolib : choix du type, des jours, du créneau, puis confirmation. */
export function SlotPicker({ slug, name, modes, visioSoon, cancelNoticeHours }: { slug: string; name: string; modes: Mode[]; visioSoon: boolean; cancelNoticeHours: number }) {
  const router = useRouter()
  const params = useSearchParams()
  const replaces = params.get('replaces')
  const [mode, setMode] = useState<Mode>(modes[0] ?? 'cabinet')
  const [from, setFrom] = useState(todayAlgiers())
  const [days, setDays] = useState<Day[] | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [picked, setPicked] = useState<string | null>(params.get('start'))
  const [member, setMember] = useState<{ firstName: string; verified: boolean } | null | undefined>(undefined)
  const [reason, setReason] = useState('')
  const [consent, setConsent] = useState(false)
  const [state, setState] = useState<{ busy?: boolean; error?: string; done?: boolean }>({})

  const load = useCallback(async () => {
    setDays(null)
    const r = await fetch(`/api/rdv/creneaux?praticien=${encodeURIComponent(slug)}&from=${from}&days=5&mode=${mode}`, { cache: 'no-store' })
    setDays(r.ok ? (await r.json()).days : [])
  }, [slug, from, mode])
  useEffect(() => {
    load()
  }, [load])
  useEffect(() => {
    fetch('/api/compte', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setMember(d.member))
      .catch(() => setMember(null))
  }, [])

  const maxRows = useMemo(() => Math.max(0, ...(days ?? []).map((d) => d.slots.length)), [days])
  const rows = expanded ? maxRows : Math.min(maxRows, 6)
  const empty = days && days.every((d) => !d.slots.length)

  const choose = (start: string) => {
    if (member === null) {
      const back = `/praticiens/${slug}?start=${encodeURIComponent(start)}${replaces ? `&replaces=${replaces}` : ''}`
      router.push(`/connexion/particulier?next=${encodeURIComponent(back)}`)
      return
    }
    setPicked(start)
    setState({})
  }

  const confirm = async () => {
    if (!picked) return
    setState({ busy: true })
    const r = await fetch('/api/rdv', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ praticien: slug, start: picked, mode, reason, consent, replaces }) })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) {
      setState({ error: d.error ?? 'Réservation impossible.' })
      if (r.status === 409) load()
      return
    }
    setState({ done: true })
  }

  if (state.done && picked)
    return (
      <div className="booking-card booking-done" role="status">
        <span className="booking-check" aria-hidden="true">✓</span>
        <h3>Rendez-vous confirmé</h3>
        <p>
          <b>{name}</b>
          <br />
          {longDate(picked)} à {hour(picked)} · {mode === 'visio' ? 'en visio' : 'au cabinet'}
        </p>
        <p className="booking-note">Un email de confirmation vous a été envoyé, avec un rappel la veille.</p>
        <Link className="button primary" href="/mon-compte">
          Voir mes rendez-vous
        </Link>
      </div>
    )

  return (
    <div className="booking-card">
      <h3>{replaces ? 'Choisir un nouveau créneau' : 'Prendre rendez-vous'}</h3>
      {(modes.length > 1 || visioSoon) && (
        <div className="booking-modes" role="radiogroup" aria-label="Type de consultation">
          {(['cabinet', 'visio'] as Mode[]).map((m) => {
            const available = modes.includes(m)
            return (
              <button key={m} type="button" role="radio" aria-checked={mode === m} disabled={!available} onClick={() => { setMode(m); setPicked(null) }}>
                {m === 'cabinet' ? 'Au cabinet' : 'En visio'}
                {!available && m === 'visio' && <small>Bientôt</small>}
              </button>
            )
          })}
        </div>
      )}

      {picked ? (
        <div className="booking-confirm">
          <p className="booking-picked">
            {longDate(picked)} à <b>{hour(picked)}</b>
            <button type="button" className="auth-link" onClick={() => setPicked(null)}>
              Modifier
            </button>
          </p>
          {member && !member.verified && <p className="auth-msg error">Confirmez d’abord votre adresse email : le lien vous a été envoyé à l’inscription.</p>}
          <label className="booking-field">
            Motif (facultatif)
            <SmartText value={reason} onChange={setReason} maxLength={300} placeholder="Ex. première consultation, suivi…" ariaLabel="Motif" />
            <small>N’indiquez pas d’informations médicales détaillées.</small>
          </label>
          <label className="auth-check">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>
              J’accepte que mes nom, téléphone, email et motif soient transmis à {name} pour ce rendez-vous (<Link href="/confidentialite">confidentialité</Link>).
            </span>
          </label>
          {state.error && <p className="auth-msg error" role="alert">{state.error}</p>}
          <button className="button primary booking-submit" disabled={!consent || state.busy || !member?.verified} onClick={confirm}>
            {state.busy ? 'Réservation…' : replaces ? 'Confirmer le déplacement' : 'Confirmer le rendez-vous'}
          </button>
          <p className="booking-note">Annulation gratuite en ligne jusqu’à {cancelNoticeHours} h avant.</p>
        </div>
      ) : (
        <>
          <div className="slot-nav">
            <button type="button" aria-label="Jours précédents" disabled={from <= todayAlgiers()} onClick={() => setFrom(addDays(from, -5))}>
              ‹
            </button>
            <div className="slot-days">
              {(days ?? Array.from({ length: 5 }, (_, i) => ({ date: addDays(from, i), slots: [] }))).map((d) => {
                const l = dayLabel(d.date)
                return (
                  <div key={d.date} className="slot-day">
                    <b>{l.wd}</b>
                    <span>{l.dm}</span>
                  </div>
                )
              })}
            </div>
            <button type="button" aria-label="Jours suivants" onClick={() => setFrom(addDays(from, 5))}>
              ›
            </button>
          </div>
          {!days ? (
            <div className="slot-grid is-loading" aria-busy="true">
              {Array.from({ length: 15 }, (_, i) => (
                <span key={i} className="slot-skeleton" />
              ))}
            </div>
          ) : empty ? (
            <div className="slot-empty">
              <p>Aucune disponibilité sur ces jours.</p>
              <button type="button" className="button outline" onClick={() => setFrom(addDays(from, 5))}>
                Voir les jours suivants
              </button>
            </div>
          ) : (
            <>
              <div className="slot-grid">
                {days.map((d) => (
                  <div key={d.date} className="slot-col">
                    {Array.from({ length: rows }, (_, i) => {
                      const s = d.slots[i]
                      return s ? (
                        <button key={s.start} type="button" className="slot" onClick={() => choose(s.start)}>
                          {hour(s.start)}
                        </button>
                      ) : (
                        <span key={i} className="slot slot-none">—</span>
                      )
                    })}
                  </div>
                ))}
              </div>
              {maxRows > 6 && (
                <button type="button" className="auth-link slot-more" onClick={() => setExpanded(!expanded)}>
                  {expanded ? 'Voir moins d’horaires' : 'Voir plus d’horaires'}
                </button>
              )}
            </>
          )}
          <p className="booking-note">Heures d’Alger. {member === null ? 'Vous créerez votre compte gratuit en 30 secondes au moment de confirmer.' : ''}</p>
        </>
      )}
    </div>
  )
}
