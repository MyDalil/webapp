'use client'

import Link from '@/platform/ui/Link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { SmartText } from '@/platform/ui/SmartText'

type Msg = { id: number; mine: boolean; from: string; body: string; at: string }
const fmt = (iso: string) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Algiers' }).format(new Date(iso))

/**
 * Messagerie DALIL d’une annonce. Personne intéressée : depuis la page de l’annonce.
 * Annonceur : depuis « Mes annonces », avec `contact` (la personne qui a écrit).
 */
export function ClassifiedChat({ id, contact, other, signedIn, loginHref, closed }: { id: number; contact?: number; other: string; signedIn: boolean; loginHref: string; closed?: boolean }) {
  const [msgs, setMsgs] = useState<Msg[] | null>(null)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  const qs = contact ? `?contact=${contact}` : ''

  const load = useCallback(() => {
    fetch(`/api/annonces/${id}/messages${qs}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { messages: [] }))
      .then((d) => setMsgs(d.messages ?? []))
  }, [id, qs])
  useEffect(() => {
    if (!signedIn) return
    load()
    const t = setInterval(load, 20000)
    return () => clearInterval(t)
  }, [signedIn, load])
  useEffect(() => end.current?.scrollIntoView({ block: 'nearest' }), [msgs])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setBusy(true)
    setError(null)
    const r = await fetch(`/api/annonces/${id}/messages${qs}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) })
    const d = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) return setError(d.error ?? 'Envoi impossible.')
    setText('')
    setMsgs((m) => [...(m ?? []), d])
  }

  if (!signedIn)
    return (
      <section className="account-block chat" id="contact">
        <h2>Contacter {other}</h2>
        <p className="muted-line">Les échanges passent par la messagerie DALIL. Connectez-vous pour écrire.</p>
        <Link className="button primary" href={loginHref}>
          Se connecter pour écrire
        </Link>
      </section>
    )

  return (
    <section className="account-block chat" id="contact">
      <h2>{contact ? `Conversation avec ${other}` : `Contacter ${other}`}</h2>
      <p className="muted-line">Les échanges restent dans DALIL. Numéros et emails sont masqués tant que l’annonceur n’a pas répondu.</p>
      <div className="chat-log" aria-live="polite">
        {!msgs ? (
          <p className="muted-line">Chargement…</p>
        ) : !msgs.length ? (
          <p className="muted-line">Aucun message pour l’instant. Posez vos questions : disponibilité, état, visite.</p>
        ) : (
          msgs.map((x) => (
            <div key={x.id} className={`chat-msg ${x.mine ? 'is-mine' : ''}`}>
              <p>{x.body}</p>
              <time>{fmt(x.at)}</time>
            </div>
          ))
        )}
        <div ref={end} />
      </div>
      {closed ? (
        <p className="muted-line">Cette annonce n’est plus en ligne : la conversation est close.</p>
      ) : (
        <form className="chat-form" onSubmit={send}>
          <SmartText multiline sentence value={text} onChange={setText} maxLength={2000} rows={2} placeholder="Votre message…" ariaLabel="Votre message" onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), (e.currentTarget.form as HTMLFormElement).requestSubmit())} />
          <button className="button primary" disabled={busy || !text.trim()}>
            Envoyer
          </button>
        </form>
      )}
      {error && <p className="auth-msg error">{error}</p>}
    </section>
  )
}
