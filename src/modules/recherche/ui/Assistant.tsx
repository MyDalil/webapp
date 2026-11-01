'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useLangRouter } from '@/platform/ui/lang'
import { toast } from '@/platform/shell/toast'
import { preferredLang, startDictation, type Dictation, type DictationLang } from '@/platform/ui/speech'
import type { Intent } from '../intent'
import { useWilaya } from '@/platform/shell/wilaya'
import { useLang, usePath } from '@/platform/ui/lang'

const ASSIST = {
  fr: { listening: 'Je vous écoute…', busy: 'DALIL réfléchit…', answer: 'Votre réponse…', ask: 'Demandez à DALIL…', open: 'Ouvrir l’assistant DALIL', send: 'Envoyer' },
  en: { listening: 'Listening…', busy: 'DALIL is thinking…', answer: 'Your answer…', ask: 'Ask DALIL…', open: 'Open the DALIL assistant', send: 'Send' },
  ar: { listening: 'أنا أستمع…', busy: 'دليل يفكّر…', answer: 'إجابتك…', ask: 'اسأل دليل…', open: 'فتح مساعد دليل', send: 'إرسال' },
}

type Hit = { type: string; url: string; title: string; subtitle: string | null; badge: string | null }
type Turn = { q: string; intent: Intent; hits: Hit[] }

const KIND: Record<string, string> = { demarche: 'Démarche', consulat: 'Consulat', adresse: 'Adresse', praticien: 'Praticien', prestataire: 'Prestataire', annonce: 'Annonce', guide: 'Guide', categorie: 'Catégorie', rubrique: 'Rubrique' }
const hitsFor = async (q: string): Promise<Hit[]> => {
  const r = await fetch(`/api/recherche?q=${encodeURIComponent(q.slice(0, 80))}`).catch(() => null)
  const d = r && r.ok ? await r.json().catch(() => ({})) : {}
  return (d.items ?? []) as Hit[]
}
/** Exemples de départ selon la page (la barre vide propose ses premières idées). */
const EXAMPLES: [RegExp, string[]][] = [
  [/^\/demarches/, ['Renouveler mon passeport', 'Acte de naissance 12S', 'Créer mon entreprise']],
  [/^\/(praticiens|annuaire\/sante)/, ['Dentiste à Alger', 'Pédiatre en visio', 'Pharmacie de garde']],
  [/^\/(services|prestataires)/, ['Plombier à Oran', 'Femme de ménage', 'Cours de maths']],
  [/^\/(vie-musulmane|annuaire\/mosquees)/, ['Mosquée près de moi', 'École coranique', 'Préparer la Omra']],
  [/./, ['Renouveler mon passeport', 'Dentiste à Alger', 'Que faire ce week-end ?']],
]
/** Phrase claire de ce que DALIL a compris (au lieu d’une simple étiquette). */
const sentence = (it: Intent) => (it.target === 'recherche' ? `Résultats pour « ${it.text} »` : it.chips.join(' · '))

/**
 * Barre « Demandez à DALIL » : une seule barre, texte ou voix. La dictée devient un brouillon propre et modifiable ;
 * à l’envoi, DALIL comprend la demande, pose une question si une information manque, puis propose d’ouvrir la bonne
 * page, pré-remplie. Rien ne se fait sans un clic de la personne.
 */
export function Assistant() {
  const router = useLangRouter()
  const path = usePath()
  const A = ASSIST[useLang()]
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
  const [sugg, setSugg] = useState<Hit[]>([])
  const [focused, setFocused] = useState(false)
  const examples = (EXAMPLES.find(([re]) => re.test(path ?? '/')) ?? EXAMPLES[EXAMPLES.length - 1])[1]
  // Propositions pendant la frappe (dès 2 lettres, pause de 250 ms).
  useEffect(() => {
    const q = text.trim()
    if (listening || busy || q.length < 2 || context) return setSugg([])
    const t = window.setTimeout(async () => setSugg((await hitsFor(q)).slice(0, 6)), 250)
    return () => window.clearTimeout(t)
  }, [text, listening, busy, context])
  const inputRef = useRef<HTMLInputElement>(null)
  const dictation = useRef<Dictation | null>(null)
  // Accueil : la barre flottante s’efface tant que la grande recherche de la photo est à l’écran.
  const [tucked, setTucked] = useState(false)
  const visibleBars = useRef<Element[]>([])
  // Fiches détaillées : l’assistant se replie en bouton rond pour ne jamais masquer le contenu (crédits photo).
  const compact = /^\/(adresses|prestataires|missions)\/|^\/praticiens\/[^/]+|^\/annonces\/[^/]+\/[^/]+|^\/guides\/[^/]+/.test(path ?? '')
  useEffect(() => {
    setTucked(false)
    // Une seule barre visible à la fois : tant qu’une barre de recherche de la page est à l’écran, la barre DALIL se replie en bouton ✦.
    let obs: IntersectionObserver | null = null
    let raf = 0
    let tries = 0
    const watch = () => {
      const bars = document.querySelectorAll('.search-bar, .dm-search, .tb-search, .cs-search, .filter-panel .field-icon, .xp-hero form[role="search"]')
      if (!bars.length) return void (tries++ < 60 && (raf = requestAnimationFrame(watch)))
      const seen = new Set<Element>()
      obs = new IntersectionObserver((es) => {
        es.forEach((e) => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)))
        visibleBars.current = [...seen]
        setTucked(seen.size > 0)
      }, { threshold: 0.01 })
      bars.forEach((b) => obs!.observe(b))
    }
    watch()
    return () => {
      cancelAnimationFrame(raf)
      obs?.disconnect()
    }
  }, [path])

  // Une barre de la page revient à l’écran : la barre DALIL vide se referme (jamais deux barres visibles).
  useEffect(() => {
    if (tucked && !text.trim() && !panel && !listening) {
      setExpanded(false)
      setFocused(false)
      const el = document.activeElement as HTMLElement | null
      if (el?.closest('.assistant-dock')) el.blur()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tucked])

  useEffect(() => {
    dictation.current?.stop()
    setListening(false)
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

  async function submit(e?: FormEvent, forced?: string) {
    e?.preventDefault()
    if (listening) return stopListening()
    const q = (forced ?? text).trim()
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
    setSugg([])
    // Réponse directe : les meilleurs résultats du site s’affichent dans le panneau, sans changer de page.
    const hits = it.question ? [] : (await hitsFor(it.text || q)).slice(0, 5)
    setTurns((t) => [...t, { q, intent: it, hits }])
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

  // Arrêt immédiat à l’écran ; le texte dicté arrive ensuite (nettoyé) dans le champ.
  function stopListening() {
    if (!dictation.current) return
    setListening(false)
    dictation.current.stop()
  }

  function mic() {
    if (listening) return stopListening()
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



  // Une seule barre à la fois : si une barre de la page est à l’écran, ✦ y place le curseur au lieu d’ouvrir une seconde barre.
  function openOrb() {
    const bar = visibleBars.current[0]
    const input = bar?.querySelector<HTMLInputElement>('input:not([type=hidden])') ?? (bar instanceof HTMLInputElement ? bar : null)
    if (!expanded && input) {
      bar!.scrollIntoView({ behavior: 'smooth', block: 'center' })
      input.focus({ preventScroll: true })
      return
    }
    setExpanded(!expanded)
  }

  if (path === '/recherche') return null

  return (
    <div className={`assistant-dock ${expanded ? 'expanded' : ''} ${compact || (tucked && !expanded && !text && !panel) ? 'is-compact' : ''}`}>
      <button className="assistant-orb" type="button" aria-label={A.open} onClick={openOrb}>
        <span aria-hidden="true">✦</span>
      </button>
      <form className={`assistant-bar is-chat${listening ? ' is-listening' : ''}${text.trim() ? ' has-text' : ''}`} onSubmit={submit}>
        {panel && turns.length > 0 && (
          <div className="assistant-card assistant-panel" role="dialog" aria-label="Conversation avec DALIL">
            <div className="assistant-panel-head">
              <strong>DALIL</strong>
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
                      {i === turns.length - 1 && (t.intent.options?.length ? (
                        <div className="assistant-options">
                          {t.intent.options.map((o) => (
                            <button key={o} type="button" className="assistant-option" onClick={() => submit(undefined, o)}>
                              {o}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <small>Répondez dans la barre, puis envoyez.</small>
                      ))}
                    </div>
                  ) : (
                    <div className="assistant-reply">
                      <p className="assistant-sentence">{sentence(t.intent)}</p>
                      {!!t.hits.length && (
                        <ul className="assistant-hits">
                          {t.hits.map((h) => (
                            <li key={h.url}>
                              <button type="button" onClick={() => go({ ...t.intent, url: h.url })}>
                                <small>{KIND[h.type] ?? h.type}{h.badge ? ` · ${h.badge}` : ''}</small>
                                <b>{h.title}</b>
                                {h.subtitle && <span>{h.subtitle}</span>}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="assistant-actions">
                        <button type="button" className="button primary" onClick={() => go(t.intent)}>
                          {t.hits.length ? 'Tous les résultats' : 'Voir les résultats'}
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
        {focused && !panel && (sugg.length > 0 || (!text.trim() && !turns.length)) && (
          <div className="assistant-card assistant-sugg" role="listbox" aria-label="Propositions">
            {sugg.length ? (
              sugg.map((h) => (
                <button key={h.url} type="button" role="option" aria-selected="false" onMouseDown={(e) => e.preventDefault()} onClick={() => router.push(h.url)}>
                  <small>{KIND[h.type] ?? h.type}</small>
                  <b>{h.title}</b>
                  {h.subtitle && <span>{h.subtitle}</span>}
                </button>
              ))
            ) : (
              <div className="assistant-examples">
                <small>Exemples :</small>
                {examples.map((x) => (
                  <button key={x} type="button" className="assistant-option" onMouseDown={(e) => e.preventDefault()} onClick={() => submit(undefined, x)}>
                    {x}
                  </button>
                ))}
              </div>
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
          onChange={(e) => setText(e.target.value)}
          onFocus={() => (setFocused(true), turns.length && setPanel(true))}
          onBlur={() => setFocused(false)}
          onPointerDown={() => listening && stopListening()}
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
