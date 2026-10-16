'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from '@/platform/shell/toast'
import { DICTATION_LANGS, preferredLang, rememberLang, startDictation, type Dictation, type DictationLang } from '@/platform/ui/speech'
import type { Intent } from '../intent'

/**
 * Barre « Demandez à DALIL » : une seule barre, texte ou voix. La dictée devient un brouillon propre et modifiable ;
 * à l’envoi, DALIL comprend la demande, pose une question si une information manque, puis propose d’ouvrir la bonne
 * page, pré-remplie. Rien ne se fait sans un clic de la personne.
 */
export function Assistant() {
  const router = useRouter()
  const path = usePathname()
  const [expanded, setExpanded] = useState(false)
  const [text, setText] = useState('')
  const [lang, setLang] = useState<DictationLang>('fr-FR')
  const [listening, setListening] = useState(false)
  const [busy, setBusy] = useState(false)
  const [intent, setIntent] = useState<Intent | null>(null)
  const [context, setContext] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const dictation = useRef<Dictation | null>(null)

  useEffect(() => {
    setExpanded(false)
    setIntent(null)
    setContext('')
  }, [path])
  useEffect(() => setLang(preferredLang()), [])
  useEffect(() => () => dictation.current?.stop(), [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    const q = text.trim()
    if (!q) return toast('Posez votre question à DALIL')
    // Réponse à une question de DALIL : on la joint à la demande précédente.
    const full = context ? `${context} ${q}` : q
    setBusy(true)
    const r = await fetch('/api/ia/demande', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: full }) })
    const d = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) return toast(d.error ?? 'DALIL n’a pas pu traiter la demande.')
    const it = d.intent as Intent | null
    if (!it) return
    setIntent(it)
    if (it.question) {
      setContext(it.text)
      setText('')
      inputRef.current?.focus()
    } else {
      setContext('')
      setText(it.text)
    }
  }

  function go() {
    if (!intent) return
    const url = intent.url
    setIntent(null)
    setText('')
    setContext('')
    router.push(url)
  }

  function mic() {
    if (listening) return dictation.current?.stop()
    const base = text
    dictation.current = startDictation({
      lang,
      onLive: (t) => setText([base.trim(), t].filter(Boolean).join(' ')),
      onError: (m) => toast(m),
      onDone: async (t) => {
        setListening(false)
        dictation.current = null
        if (!t) return setText(base)
        setBusy(true)
        const r = await fetch('/api/ia/texte', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: t, mode: 'dictation' }) })
        const d = await r.json().catch(() => ({}))
        setBusy(false)
        setText([base.trim(), String(d.text ?? t)].filter(Boolean).join(' '))
        inputRef.current?.focus()
      },
    })
    if (dictation.current) setListening(true)
  }

  function cycleLang() {
    const i = DICTATION_LANGS.findIndex((l) => l.value === lang)
    const next = DICTATION_LANGS[(i + 1) % DICTATION_LANGS.length].value
    setLang(next)
    rememberLang(next)
  }

  if (path === '/recherche') return null

  return (
    <div className={`assistant-dock ${expanded ? 'expanded' : ''}`}>
      <button className="assistant-orb" type="button" aria-label="Ouvrir l’assistant DALIL" onClick={() => setExpanded(!expanded)}>
        <span aria-hidden="true">✦</span>
      </button>
      <form className="assistant-bar has-lang" onSubmit={submit}>
        {intent && (
          <div className="assistant-card" role="dialog" aria-label="Ce que DALIL a compris">
            {intent.question ? (
              <>
                <p className="assistant-q">{intent.question}</p>
                <small>Répondez dans la barre, puis envoyez.</small>
              </>
            ) : (
              <>
                <small>DALIL a compris :</small>
                <div className="assistant-chips">
                  {intent.chips.map((c) => (
                    <span key={c} className="chip">
                      {c}
                    </span>
                  ))}
                </div>
                <div className="assistant-actions">
                  <button type="button" className="button primary" onClick={go}>
                    Voir les résultats
                  </button>
                  <button
                    type="button"
                    className="button outline"
                    onClick={() => {
                      setIntent(null)
                      inputRef.current?.focus()
                    }}
                  >
                    Modifier
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        <label className="sr-only" htmlFor="assistant-input">
          Que recherchez-vous ?
        </label>
        <input
          id="assistant-input"
          ref={inputRef}
          name="query"
          value={text}
          dir="auto"
          readOnly={busy}
          maxLength={600}
          onChange={(e) => {
            setText(e.target.value)
            if (intent && !intent.question) setIntent(null)
          }}
          placeholder={listening ? 'Je vous écoute…' : busy ? 'DALIL réfléchit…' : intent?.question ? 'Votre réponse…' : 'Demandez à DALIL…'}
          autoComplete="off"
        />
        <button className="dock-lang" type="button" aria-label="Langue de la dictée" title="Langue de la dictée" onClick={cycleLang} disabled={listening}>
          {DICTATION_LANGS.find((l) => l.value === lang)?.label}
        </button>
        <button className="dock-icon" type="button" aria-label="Ajouter un document" onClick={() => router.push('/recherche')}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m21.4 11.6-8.9 8.9a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 1 1 5.7 5.7l-9.2 9.2a2 2 0 1 1-2.8-2.8l8.5-8.5" />
          </svg>
        </button>
        <button className={`dock-icon ${listening ? 'recording' : ''}`} type="button" aria-pressed={listening} aria-label={listening ? 'Arrêter la dictée' : 'Parler à DALIL'} onClick={mic} disabled={busy}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="9" y="3" width="6" height="12" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" />
          </svg>
        </button>
        <button className="assistant-send" type="submit" aria-label="Envoyer" disabled={busy || listening}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m5 12 14-7-4 14-3-6-7-1Z" />
          </svg>
        </button>
      </form>
    </div>
  )
}
