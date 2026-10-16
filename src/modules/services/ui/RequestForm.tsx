'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

type Offer = { activity: string; label: string; pricing: 'hour' | 'flat'; price: number | null; hours: number; priceLabel: string }
type Day = { date: string; starts: string[] }
type Me = { firstName: string; verified: boolean; gender: string | null } | null

const TZ = 'Africa/Algiers'
const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('fr-FR', { ...o, timeZone: TZ })
const wd = (d: string) => fmt({ weekday: 'short' }).format(new Date(`${d}T12:00:00Z`)).replace('.', '')
const dm = (d: string) => fmt({ day: 'numeric', month: 'short' }).format(new Date(`${d}T12:00:00Z`)).replace('.', '')
const hour = (iso: string) => fmt({ hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
const longDate = (iso: string) => fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso))
const money = (n: number) => `${new Intl.NumberFormat('fr-FR').format(Math.round(n))} DA`
const today = () => new Date(Date.now() + 3600e3).toISOString().slice(0, 10)
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10)
const DAYS = 14

/** Demande de mission : prestation, durée, jour et heure, adresse, description. Le prestataire répond sous 24 h. */
export function RequestForm({ slug, name, offers, communes, clientele, initialActivity }: { slug: string; name: string; offers: Offer[]; communes: { id: string; name: string }[]; clientele: 'all' | 'women' | 'men'; initialActivity?: string }) {
  const router = useRouter()
  const [activity, setActivity] = useState(offers.find((o) => o.activity === initialActivity)?.activity ?? offers[0]?.activity)
  const offer = offers.find((o) => o.activity === activity)
  const [hours, setHours] = useState(offer?.pricing === 'hour' ? Math.max(1, Math.round(offer.hours)) : 2)
  const [from, setFrom] = useState(today())
  const [days, setDays] = useState<Day[] | null>(null)
  const [date, setDate] = useState<string | null>(null)
  const [start, setStart] = useState<string | null>(null)
  const [me, setMe] = useState<Me | undefined>(undefined)
  const [gender, setGender] = useState('')
  const [consent, setConsent] = useState(false)
  const [state, setState] = useState<{ busy?: boolean; error?: string }>({})

  const load = useCallback(async () => {
    if (!activity) return
    setDays(null)
    const r = await fetch(`/api/services/disponibilites?prestataire=${encodeURIComponent(slug)}&activite=${activity}&heures=${hours}&from=${from}&days=${DAYS}`, { cache: 'no-store' })
    const d: Day[] = r.ok ? (await r.json()).days : []
    setDays(d)
    setDate((cur) => (cur && d.some((x) => x.date === cur && x.starts.length) ? cur : (d.find((x) => x.starts.length)?.date ?? null)))
  }, [slug, activity, hours, from])
  useEffect(() => {
    load()
  }, [load])
  useEffect(() => {
    fetch('/api/compte', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setMe(d.member))
      .catch(() => setMe(null))
  }, [])
  useEffect(() => setStart(null), [activity, hours, date])

  const estimate = useMemo(() => (offer?.price ? (offer.pricing === 'flat' ? offer.price : offer.price * hours) : null), [offer, hours])
  const starts = days?.find((d) => d.date === date)?.starts ?? []
  const needGender = clientele !== 'all' && me && !me.gender
  const wrongGender = clientele !== 'all' && me?.gender && me.gender !== (clientele === 'women' ? 'femme' : 'homme')

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!start || !offer) return
    if (!me) return router.push(`/connexion/particulier?next=${encodeURIComponent(`/prestataires/${slug}?activite=${offer.activity}`)}`)
    const f = new FormData(e.currentTarget)
    setState({ busy: true })
    const r = await fetch('/api/services/missions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prestataire: slug, activity: offer.activity, start, hours, commune: f.get('commune'), address: f.get('address'), details: f.get('details'), gender: gender || undefined, consent }),
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) {
      setState({ error: d.error ?? 'Envoi impossible.' })
      if (r.status === 409) load()
      return
    }
    router.push(`/missions/${d.id}`)
  }

  if (!offers.length) return null
  return (
    <form className="booking-card request-form" onSubmit={submit}>
      <h3>Demander une mission</h3>

      <fieldset className="req-step">
        <legend>Prestation</legend>
        <div className="req-offers" role="radiogroup">
          {offers.map((o) => (
            <button key={o.activity} type="button" role="radio" aria-checked={activity === o.activity} className="req-offer" onClick={() => setActivity(o.activity)}>
              <span>{o.label}</span>
              <b>{o.priceLabel}</b>
            </button>
          ))}
        </div>
      </fieldset>

      {offer?.pricing === 'hour' && (
        <fieldset className="req-step">
          <legend>Durée estimée</legend>
          <div className="req-stepper">
            <button type="button" aria-label="Moins" disabled={hours <= 1} onClick={() => setHours(hours - 1)}>
              −
            </button>
            <b>{hours} h</b>
            <button type="button" aria-label="Plus" disabled={hours >= 10} onClick={() => setHours(hours + 1)}>
              +
            </button>
          </div>
        </fieldset>
      )}
      {estimate !== null && (
        <p className="req-estimate">
          Estimation : <b>{money(estimate)}</b>
          {offer?.pricing === 'hour' ? ` (${money(offer.price ?? 0)}/h × ${hours} h)` : ' (forfait)'}
          <small>À régler directement au prestataire. Prix final confirmé ensemble dans la messagerie.</small>
        </p>
      )}

      <fieldset className="req-step">
        <legend>Quand ?</legend>
        <div className="slot-nav">
          <button type="button" aria-label="Jours précédents" disabled={from <= today()} onClick={() => setFrom(addDays(from, -DAYS))}>
            ‹
          </button>
          <div className="req-days">
            {(days ?? Array.from({ length: DAYS }, (_, i) => ({ date: addDays(from, i), starts: [] }))).map((d) => (
              <button key={d.date} type="button" className="req-day" aria-pressed={date === d.date} disabled={!days || !d.starts.length} onClick={() => setDate(d.date)}>
                <b>{wd(d.date)}</b>
                <span>{dm(d.date)}</span>
              </button>
            ))}
          </div>
          <button type="button" aria-label="Jours suivants" onClick={() => setFrom(addDays(from, DAYS))}>
            ›
          </button>
        </div>
        {!days ? (
          <div className="slot-grid is-loading" aria-busy="true">
            {Array.from({ length: 8 }, (_, i) => (
              <span key={i} className="slot-skeleton" />
            ))}
          </div>
        ) : !date ? (
          <p className="muted-line">Aucune disponibilité sur ces jours pour cette durée. Essayez les jours suivants ou une durée plus courte.</p>
        ) : (
          <div className="req-times">
            {starts.map((s) => (
              <button key={s} type="button" className="slot" aria-pressed={start === s} onClick={() => setStart(s)}>
                {hour(s)}
              </button>
            ))}
          </div>
        )}
      </fieldset>

      {start && (
        <>
          <p className="booking-picked">
            {longDate(start)} à <b>{hour(start)}</b>
          </p>
          <label className="booking-field">
            Commune
            <select name="commune" required defaultValue="">
              <option value="" disabled>
                Choisir…
              </option>
              {communes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="booking-field">
            Adresse
            <input name="address" required minLength={5} maxLength={200} autoComplete="street-address" placeholder="Rue, bâtiment, étage" />
            <small>Transmise au prestataire seulement s’il accepte.</small>
          </label>
          <label className="booking-field">
            Votre besoin
            <textarea name="details" maxLength={1000} rows={3} placeholder="Ex. 3 pièces, matériel fourni ; montage d’une armoire 2 portes…" />
          </label>
          {needGender && (
            <fieldset className="req-step">
              <legend>{clientele === 'women' ? 'Ce prestataire reçoit uniquement des clientes.' : 'Ce prestataire reçoit uniquement des clients.'} Vous êtes :</legend>
              <div className="booking-modes">
                {(
                  [
                    ['femme', 'Une femme'],
                    ['homme', 'Un homme'],
                  ] as const
                ).map(([v, l]) => (
                  <button key={v} type="button" role="radio" aria-checked={gender === v} onClick={() => setGender(v)}>
                    {l}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          {wrongGender && <p className="auth-msg error">{clientele === 'women' ? 'Ce prestataire réserve ses services aux clientes.' : 'Ce prestataire réserve ses services aux clients.'}</p>}
          {me && !me.verified && <p className="auth-msg error">Confirmez d’abord votre adresse email : le lien vous a été envoyé à l’inscription.</p>}
          <label className="auth-check">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>
              J’accepte que mon prénom, ma demande et, s’il accepte, mon adresse soient transmis à {name} (<Link href="/confidentialite">confidentialité</Link>).
            </span>
          </label>
          {state.error && (
            <p className="auth-msg error" role="alert">
              {state.error}
            </p>
          )}
          <button className="button primary booking-submit" disabled={!consent || state.busy || Boolean(wrongGender) || Boolean(needGender && !gender) || (me ? !me.verified : false)}>
            {state.busy ? 'Envoi…' : me === null ? 'Me connecter pour envoyer' : 'Envoyer ma demande'}
          </button>
          <p className="booking-note">Réponse sous 24 h. Gratuit et sans engagement tant que la mission n’est pas acceptée.</p>
        </>
      )}
    </form>
  )
}
