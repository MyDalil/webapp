'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from '@/platform/shell/toast'
import { preferredLang, startDictation, type Dictation, type DictationLang } from '@/platform/ui/speech'
import type { Intent } from '../intent'
import { useWilaya } from '@/platform/shell/wilaya'
import { langOf } from '@/platform/i18n'

const ASSIST = {
  fr: { listening: 'Je vous écoute…', busy: 'DALIL réfléchit…', answer: 'Votre réponse…', ask: 'Demandez à DALIL…', open: 'Ouvrir l’assistant DALIL', send: 'Envoyer' },
  en: { listening: 'Listening…', busy: 'DALIL is thinking…', answer: 'Your answer…', ask: 'Ask DALIL…', open: 'Open the DALIL assistant', send: 'Send' },
  ar: { listening: 'أنا أستمع…', busy: 'دليل يفكّر…', answer: 'إجابتك…', ask: 'اسأل دليل…', open: 'فتح مساعد دليل', send: 'إرسال' },
}

type Turn = { q: string; intent: Intent }

/**
 * Barre « Demandez à DALIL » : une seule barre, texte ou voix. La dictée devient un brouillon propre et modifiable ;
 * à l’envoi, DALIL comprend la demande, pose une question si une information manque, puis propose d’ouvrir la bonne
 * page, pré-remplie. Rien ne se fait sans un clic de la personne.
 */
export function Assistant() {
  const router = useRouter()
  const path = usePathname()
  const A = ASSIST[langOf(path || '/')]
  const [expanded, setExpanded] = useState(false)
  const [text, setText] = useState('')
  const [lang, setLang] = useState<DictationLang>('fr-FR')
  const [listening, setListening] = useState(false)
  const [busy, setBusy] = useState(false)
  const [intent, setIntent] = useState<Intent | null>(null)
  // Conversation guidée : l’échange reste affiché jusqu’à ce que la personne ouvre une page ou recommence.
  const [turns, setTurns] = useState<Turn[]>([])
  const [panel, setPanel] = useState(false)
  const wilaya = useWilaya()
  const logRef = useRef<HTMLDivElement>(null)
  const [context, setContext] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const dictation = useRef<Dictation | null>(null)
  // Accueil : la barre flottante s’efface tant que la grande recherche de la photo est à l’écran.
  const [tucked, setTucked] = useState(false)
  // Fiches détaillées : l’assistant se replie en bouton rond pour ne jamais masquer le contenu (crédits photo).
  const compact = /^\/(adresses|prestataires|missions)\/|^\/praticiens\/[^/]+|^\/annonces\/[^/]+\/[^/]+|^\/guides\/[^/]+/.test(path ?? '')
  useEffect(() => {
    setTucked(false)
    if (path !== '/') return
    let obs: IntersectionObserver | null = null
    let raf = 0
    const watch = () => {
      const hero = document.querySelector('.search-bar')
      if (!hero) return void (raf = requestAnimationFrame(watch))
      obs = new IntersectionObserver(([e]) => setTucked(e.isIntersecting), { threshold: 0.01 })
      obs.observe(hero)
    }
    watch()
    return () => {
      cancelAnimationFrame(raf)
      obs?.disconnect()
    }
  }, [path])

  useEffect(() => {
    setExpanded(false)
    setIntent(null)
    setContext('')
    setTurns([])
    setPanel(false)
  }, [path])
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [turns.length])
  // Échap ferme le panneau : la page et la position de lecture ne bougent pas.
  useEffect(() => {
    if (!panel) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (setPanel(false), inputRef.current?.focus())
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panel])
  const reset = () => {
    setTurns([])
    setIntent(null)
    setContext('')
    setText('')
    inputRef.current?.focus()
  }
  useEffect(() => setLang(preferredLang()), [])
  useEffect(() => () => dictation.current?.stop(), [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    const q = text.trim()
    if (!q) return toast('Posez votre question à DALIL')
    // Réponse à une question de DALIL : on la joint à la demande précédente.
    const full = context ? `${context} ${q}` : q
    setBusy(true)
    const page = document.title.replace(/ · DALIL$/, '').slice(0, 120)
    const r = await fetch('/api/ia/demande', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: full, page, wilaya: wilaya?.code ?? null }) })
    const d = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) return toast(d.error ?? 'DALIL n’a pas pu traiter la demande.')
    const it = d.intent as Intent | null
    if (!it) return
    setIntent(it)
    setTurns((t) => [...t, { q, intent: it }])
    setPanel(true)
    setText('')
    if (it.question) {
      setContext(it.text)
      inputRef.current?.focus()
    } else setContext('')
  }

  function go(target?: Intent) {
    const it = target ?? intent
    if (!it) return
    const url = it.url
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



  if (path === '/recherche') return null

  return (
    <div className={`assistant-dock ${expanded ? 'expanded' : ''} ${compact ? 'is-compact' : ''} ${tucked && !expanded && !text ? 'is-tucked' : ''}`} aria-hidden={tucked && !expanded && !text ? true : undefined}>
      <button className="assistant-orb" type="button" aria-label={A.open} onClick={() => setExpanded(!expanded)}>
        <span aria-hidden="true">✦</span>
      </button>
      <form className={`assistant-bar is-chat${listening ? ' is-listening' : ''}${text.trim() ? ' has-text' : ''}`} onSubmit={submit}>
        {panel && turns.length > 0 && (
          <div className="assistant-card assistant-panel" role="dialog" aria-label="Conversation avec DALIL">
            <div className="assistant-panel-head">
              <strong>DALIL</strong>
              <small>
                Contexte : {document.title.replace(/ · DALIL$/, '')}
                {wilaya ? ` · ${wilaya.name}` : ''}
              </small>
              <button type="button" className="assistant-link" onClick={reset}>
                Nouvelle demande
              </button>
              <button type="button" className="assistant-close" aria-label="Fermer la conversation" onClick={() => setPanel(false)}>
                ×
              </button>
            </div>
            <div className="assistant-log" ref={logRef} aria-live="polite">
              {turns.map((t, i) => (
                <div key={i} className="assistant-turn">
                  <p className="assistant-me">{t.q}</p>
                  {t.intent.question ? (
                    <div className="assistant-reply">
                      <p className="assistant-q">{t.intent.question}</p>
                      {i === turns.length - 1 && <small>Répondez dans la barre, puis envoyez.</small>}
                    </div>
                  ) : (
                    <div className="assistant-reply">
                      <small>DALIL a compris :</small>
                      <div className="assistant-chips">
                        {t.intent.chips.map((c) => (
                          <span key={c} className="chip">
                            {c}
                          </span>
                        ))}
                      </div>
                      <div className="assistant-actions">
                        <button type="button" className="button primary" onClick={() => go(t.intent)}>
                          Voir les résultats
                        </button>
                        {i === turns.length - 1 && (
                          <button
                            type="button"
                            className="button outline"
                            onClick={() => {
                              setText(t.q)
                              inputRef.current?.focus()
                            }}
                          >
                            Modifier
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
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
          onChange={(e) => setText(e.target.value)}
          onFocus={() => turns.length && setPanel(true)}
          placeholder={listening ? A.listening : busy ? A.busy : intent?.question ? A.answer : A.ask}
          autoComplete="off"
        />
        {listening && (
          <span className="assistant-wave" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
        )}
        <button className={`dock-icon ${listening ? 'recording' : ''}`} type="button" aria-pressed={listening} aria-label={listening ? 'Arrêter la dictée' : 'Parler à DALIL'} onClick={mic} disabled={busy}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="9" y="3" width="6" height="12" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" />
          </svg>
        </button>
        <button className="assistant-send" type="submit" aria-label={A.send} disabled={busy || listening || !text.trim()}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      </form>
    </div>
  )
}
