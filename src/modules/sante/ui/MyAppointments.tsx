'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type A = {
  id: number
  start: string
  mode: 'cabinet' | 'visio'
  status: string
  reason: string | null
  practitioner: { name: string; slug: string; address: string | null; city: string; fee: string | null; payment: string | null }
  patient?: { name: string; phone: string; email: string }
  videoUrl: string | null
  canCancel: boolean
}

const TZ = 'Africa/Algiers'
const fmt = (iso: string) => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: TZ }).format(new Date(iso))
const STATUS: Record<string, string> = { confirmed: 'Confirmé', cancelled: 'Annulé', completed: 'Honoré', no_show: 'Non honoré' }

/** Liste de rendez-vous, côté patient (par défaut) ou côté praticien. */
export function AppointmentList({ items, side, onChange }: { items: A[]; side: 'patient' | 'practitioner'; onChange: () => void }) {
  const [busy, setBusy] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const cancel = async (id: number) => {
    const reason = side === 'practitioner' ? window.prompt('Motif de l’annulation (envoyé au patient) :') ?? '' : ''
    if (side === 'patient' && !window.confirm('Annuler ce rendez-vous ?')) return
    setBusy(id)
    const r = await fetch(`/api/rdv/${id}/annuler`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ by: side, reason }) })
    setBusy(null)
    if (!r.ok) setError((await r.json().catch(() => ({}))).error ?? 'Annulation impossible.')
    else onChange()
  }
  if (!items.length) return <p className="muted-line">Aucun rendez-vous.</p>
  return (
    <>
      {error && <p className="auth-msg error" role="alert">{error}</p>}
      <ul className="rdv-list">
        {items.map((a) => (
          <li key={a.id} className={`rdv-item rdv-${a.status}`}>
            <div className="rdv-when">
              <b>{fmt(a.start)}</b>
              <span className="chip">{a.mode === 'visio' ? 'Visio' : 'Cabinet'}</span>
              {a.status !== 'confirmed' && <span className="rdv-status">{STATUS[a.status] ?? a.status}</span>}
            </div>
            <div className="rdv-who">
              {side === 'patient' ? (
                <>
                  <Link href={`/praticiens/${a.practitioner.slug}`}>{a.practitioner.name}</Link>
                  <span>{a.mode === 'visio' ? (a.videoUrl ? <a href={a.videoUrl}>Rejoindre la consultation</a> : 'Lien envoyé avant la consultation') : [a.practitioner.address, a.practitioner.city].filter(Boolean).join(', ')}</span>
                  {(a.practitioner.fee || a.practitioner.payment) && <small>{[a.practitioner.fee, a.practitioner.payment].filter(Boolean).join(' · ')} — à régler au praticien</small>}
                </>
              ) : (
                <>
                  <b>{a.patient?.name}</b>
                  <span>
                    <a href={`tel:${a.patient?.phone}`}>{a.patient?.phone}</a> · <a href={`mailto:${a.patient?.email}`}>{a.patient?.email}</a>
                  </span>
                  {a.reason && <small>Motif : {a.reason}</small>}
                </>
              )}
            </div>
            {a.status === 'confirmed' && (
              <div className="rdv-actions">
                {side === 'patient' && a.canCancel && (
                  <Link className="button outline" href={`/praticiens/${a.practitioner.slug}?replaces=${a.id}`}>
                    Déplacer
                  </Link>
                )}
                {a.canCancel ? (
                  <button className="button outline" disabled={busy === a.id} onClick={() => cancel(a.id)}>
                    Annuler
                  </button>
                ) : (
                  side === 'patient' && <small>Trop tard pour annuler en ligne : contactez le cabinet.</small>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}

/** Espace patient : rendez-vous à venir et passés. */
export function MyAppointments() {
  const [items, setItems] = useState<A[] | null>(null)
  // Heure de référence prise au chargement (pas pendant le rendu) : à venir / passés.
  const [loadedAt, setLoadedAt] = useState(0)
  const load = () =>
    fetch('/api/rdv', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { appointments: [] }))
      .then((d) => {
        setLoadedAt(Date.now())
        setItems(d.appointments)
      })
  useEffect(() => {
    load()
  }, [])
  if (!items) return <p className="muted-line">Chargement…</p>
  const now = loadedAt
  const upcoming = items.filter((a) => a.status === 'confirmed' && Date.parse(a.start) >= now).sort((a, b) => a.start.localeCompare(b.start))
  const past = items.filter((a) => !upcoming.includes(a))
  return (
    <>
      <section className="account-block">
        <h2>Mes prochains rendez-vous</h2>
        {upcoming.length ? (
          <AppointmentList items={upcoming} side="patient" onChange={load} />
        ) : (
          <p className="muted-line">
            Aucun rendez-vous à venir. <Link href="/praticiens">Trouver un praticien</Link>
          </p>
        )}
      </section>
      {!!past.length && (
        <section className="account-block">
          <h2>Historique</h2>
          <AppointmentList items={past} side="patient" onChange={load} />
        </section>
      )}
    </>
  )
}
