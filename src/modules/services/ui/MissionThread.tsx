'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { MissionView } from '../marketplace'
import { shrinkImage } from './shrink'

type Msg = { id: number; mine: boolean; from: string; body: string; at: string }

const TZ = 'Africa/Algiers'
const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('fr-FR', { ...o, timeZone: TZ }).format(new Date(iso))
const STATUS: Record<string, [string, string]> = {
  requested: ['En attente de réponse', 'pending'],
  accepted: ['Acceptée', 'ok'],
  declined: ['Déclinée', 'off'],
  expired: ['Sans réponse', 'off'],
  cancelled: ['Annulée', 'off'],
  completed: ['Terminée', 'ok'],
}

/** Mission : détails, actions (accepter, décliner, annuler, terminer), messagerie DALIL et avis. */
export function MissionThread({ initial }: { initial: MissionView }) {
  const [m, setM] = useState(initial)
  const [msgs, setMsgs] = useState<Msg[] | null>(null)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  const closed = ['declined', 'expired', 'cancelled'].includes(m.status)

  const loadMsgs = useCallback(async () => {
    const r = await fetch(`/api/services/missions/${m.id}/messages`, { cache: 'no-store' })
    if (r.ok) setMsgs((await r.json()).messages)
  }, [m.id])
  useEffect(() => {
    loadMsgs()
    const t = setInterval(() => document.visibilityState === 'visible' && loadMsgs(), 10000)
    return () => clearInterval(t)
  }, [loadMsgs])
  useEffect(() => end.current?.scrollIntoView({ block: 'nearest' }), [msgs?.length])

  const act = async (action: string) => {
    let reason = ''
    if (action === 'cancel') {
      if (m.role === 'provider') reason = window.prompt('Motif de l’annulation (envoyé au client) :') ?? ''
      else if (!window.confirm('Annuler cette mission ?')) return
      if (m.role === 'provider' && !reason.trim()) return
    }
    if (action === 'decline') reason = window.prompt('Un mot pour le client (facultatif) :') ?? ''
    setBusy(true)
    setError(null)
    const r = await fetch(`/api/services/missions/${m.id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, reason }) })
    const d = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) return setError(d.error ?? 'Action impossible.')
    setM(d.mission)
  }

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    setBusy(true)
    const r = await fetch(`/api/services/missions/${m.id}/messages`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ body: text }) })
    const d = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) return setError(d.error ?? 'Envoi impossible.')
    setText('')
    setError(null)
    setMsgs([...(msgs ?? []), d.message])
  }

  const [label, tone] = STATUS[m.status] ?? [m.status, 'pending']
  const other = m.role === 'client' ? m.provider.name : m.client.name
  return (
    <div className="mission-layout">
      <section className="account-block mission-card">
        <div className="mission-head">
          <span className={`mission-status is-${tone}`}>{label}</span>
          {m.categoryLabel && <span className="chip chip-plain">{m.categoryLabel}</span>}
        </div>
        <h1>{m.activityLabel}</h1>
        <p className="mission-when">
          {fmt(m.start, { weekday: 'long', day: 'numeric', month: 'long' })} à {fmt(m.start, { hour: '2-digit', minute: '2-digit' })} · environ {m.hours} h
        </p>
        <dl className="mission-facts">
          <dt>{m.role === 'client' ? 'Prestataire' : 'Client'}</dt>
          <dd>{m.role === 'client' ? <Link href={`/prestataires/${m.provider.slug}`}>{m.provider.name}</Link> : m.client.name}</dd>
          <dt>Lieu</dt>
          <dd>
            {m.address ? `${m.address}, ` : ''}
            {m.communeName}
            {!m.address && m.role === 'provider' && <small> — adresse exacte transmise dès que vous acceptez</small>}
          </dd>
          <dt>Prix</dt>
          <dd>
            {m.estimate ? `Estimation ${m.estimate}${m.pricing === 'flat' ? ' (forfait)' : ''}` : 'À convenir'}
            <small>
              {' '}
              — à régler directement au prestataire{m.provider.payment ? ` (${m.provider.payment})` : ''}. DALIL n’encaisse rien.
            </small>
          </dd>
          {m.details && (
            <>
              <dt>Besoin</dt>
              <dd className="mission-details">{m.details}</dd>
            </>
          )}
        </dl>
        {m.status === 'requested' && (
          <p className="muted-line">
            {m.role === 'client' ? `${m.provider.name} doit répondre` : 'Répondez'} avant le {fmt(m.respondBy, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}.
          </p>
        )}
        {error && (
          <p className="auth-msg error" role="alert">
            {error}
          </p>
        )}
        <div className="rdv-actions">
          {m.canAccept && (
            <button className="button primary" disabled={busy} onClick={() => act('accept')}>
              Accepter la mission
            </button>
          )}
          {m.canDecline && (
            <button className="button outline" disabled={busy} onClick={() => act('decline')}>
              Décliner
            </button>
          )}
          {m.canComplete && (
            <button className="button primary" disabled={busy} onClick={() => act('complete')}>
              La mission a eu lieu
            </button>
          )}
          {m.canCancel && (
            <button className="button outline" disabled={busy} onClick={() => act('cancel')}>
              Annuler
            </button>
          )}
          {closed && m.role === 'client' && (
            <Link className="button outline" href="/services">
              Trouver un autre prestataire
            </Link>
          )}
        </div>
        {m.canReview && <ReviewForm id={m.id} name={m.provider.name} onDone={setM} />}
        {m.review && (
          <p className="mission-review">
            Votre avis : {'★'.repeat(m.review.rating)}
            {'☆'.repeat(5 - m.review.rating)} {m.review.comment && `— « ${m.review.comment} »`}
          </p>
        )}
      </section>

      <section className="account-block chat">
        <h2>Messagerie avec {other}</h2>
        <p className="muted-line">Les échanges restent dans DALIL{m.status === 'requested' ? ' ; numéros et emails sont masqués tant que la mission n’est pas acceptée' : ''}.</p>
        <div className="chat-log" aria-live="polite">
          {!msgs ? (
            <p className="muted-line">Chargement…</p>
          ) : !msgs.length ? (
            <p className="muted-line">Aucun message pour l’instant. {m.role === 'client' ? 'Posez vos questions au prestataire.' : 'Présentez-vous ou posez vos questions.'}</p>
          ) : (
            msgs.map((x) => (
              <div key={x.id} className={`chat-msg ${x.mine ? 'is-mine' : ''}`}>
                <p>{x.body}</p>
                <time>{fmt(x.at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time>
              </div>
            ))
          )}
          <div ref={end} />
        </div>
        {!closed && (
          <form className="chat-form" onSubmit={send}>
            <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} rows={2} placeholder="Votre message…" aria-label="Votre message" onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), (e.currentTarget.form as HTMLFormElement).requestSubmit())} />
            <button className="button primary" disabled={busy || !text.trim()}>
              Envoyer
            </button>
          </form>
        )}
      </section>
    </div>
  )
}

function ReviewForm({ id, name, onDone }: { id: number; name: string; onDone: (m: MissionView) => void }) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const previews = useRef<string[]>([])
  previews.current = files.map((f, i) => previews.current[i] ?? URL.createObjectURL(f))
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const body = new FormData()
    body.set('rating', String(rating))
    body.set('comment', comment)
    for (const f of files) body.append('photos', await shrinkImage(f, 1600), 'photo.jpg')
    const r = await fetch(`/api/services/missions/${id}/avis`, { method: 'POST', body })
    const d = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) return setError(d.error ?? 'Avis impossible.')
    onDone(d.mission)
  }
  return (
    <form className="review-form" onSubmit={submit}>
      <h3>Votre avis sur {name}</h3>
      <div className="stars" role="radiogroup" aria-label="Note">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} sur 5`} className={n <= rating ? 'on' : ''} onClick={() => setRating(n)}>
            ★
          </button>
        ))}
      </div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} rows={3} placeholder="Ponctualité, qualité du travail, communication…" aria-label="Commentaire" />
      <div className="review-photos">
        {files.map((f, i) => (
          <button key={`${f.name}-${i}`} type="button" className="review-thumb" style={{ backgroundImage: `url(${previews.current[i]})` }} aria-label="Retirer la photo" onClick={() => setFiles(files.filter((_, k) => k !== i))}>
            ×
          </button>
        ))}
        {files.length < 4 && (
          <label className="review-add">
            + Photo du travail
            <input type="file" accept="image/*" multiple hidden onChange={(e) => setFiles([...files, ...Array.from(e.target.files ?? [])].slice(0, 4))} />
          </label>
        )}
      </div>
      {error && <p className="auth-msg error">{error}</p>}
      <button className="button primary" disabled={!rating || busy}>
        {busy ? 'Publication…' : 'Publier mon avis'}
      </button>
      <small className="muted-line">Avis vérifié : seuls les clients d’une mission réalisée via DALIL peuvent en laisser un. Jusqu’à 4 photos, publiées tout de suite et contrôlées par l’équipe.</small>
    </form>
  )
}
