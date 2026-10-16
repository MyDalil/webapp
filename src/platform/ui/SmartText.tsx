'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type KeyboardEvent } from 'react'
import { DICTATION_LANGS, dictationSupported, preferredLang, rememberLang, startDictation, type Dictation, type DictationLang } from './speech'

type Props = {
  name?: string
  id?: string
  value?: string
  defaultValue?: string
  onChange?: (v: string) => void
  multiline?: boolean
  rows?: number
  maxLength?: number
  minLength?: number
  required?: boolean
  placeholder?: string
  ariaLabel?: string
  className?: string
  autoComplete?: string
  /** Termine la dictée par un point (messages) ; non pour une recherche. */
  sentence?: boolean
  /** Bouton ✦ « Améliorer » (comptes connectés) ; désactivable pour une recherche. */
  improve?: boolean
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => void
}

export type SmartTextHandle = { focus: () => void; value: () => string; set: (v: string) => void }

let memberCheck: Promise<boolean> | null = null
const isMember = () =>
  (memberCheck ??= fetch('/api/compte', { cache: 'no-store' })
    .then((r) => r.json())
    .then((d) => Boolean(d.member?.verified))
    .catch(() => false))

async function cleanup(text: string, mode: 'dictation' | 'improve', sentence: boolean) {
  const r = await fetch('/api/ia/texte', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, mode, sentence }) })
  const d = await r.json().catch(() => ({}))
  return r.ok ? { text: String(d.text ?? text), notice: (d.notice as string | null) ?? null } : { text: null, notice: (d.error as string) ?? 'Amélioration impossible pour le moment.' }
}

/**
 * Champ de message de DALIL : on tape ou on dicte (texte en direct), la dictée devient un brouillon propre et
 * modifiable ; ✦ reformule à la demande, sans omettre d’idée, et s’annule d’un geste. Rien n’est envoyé sans la personne.
 */
export const SmartText = forwardRef<SmartTextHandle, Props>(function SmartText(p, ref) {
  const controlled = p.value !== undefined
  const [inner, setInner] = useState(p.defaultValue ?? '')
  const val = controlled ? (p.value as string) : inner
  const set = (v: string) => {
    const next = p.maxLength ? v.slice(0, p.maxLength) : v
    if (!controlled) setInner(next)
    p.onChange?.(next)
  }
  const field = useRef<HTMLTextAreaElement & HTMLInputElement>(null)
  useImperativeHandle(ref, () => ({ focus: () => field.current?.focus(), value: () => val, set }), [val])

  const [lang, setLang] = useState<DictationLang>('fr-FR')
  const [canDictate, setCanDictate] = useState(false)
  const [member, setMember] = useState(false)
  const [listening, setListening] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [undo, setUndo] = useState<string | null>(null)
  const dictation = useRef<Dictation | null>(null)
  const base = useRef('')

  useEffect(() => {
    setLang(preferredLang())
    setCanDictate(dictationSupported())
    if (p.improve !== false) isMember().then(setMember)
  }, [p.improve])
  useEffect(() => () => dictation.current?.stop(), [])
  // Formulaire réinitialisé après envoi (form.reset()) : le champ repart vide.
  useEffect(() => {
    const form = field.current?.form
    if (!form || controlled) return
    const onReset = () => setInner(p.defaultValue ?? '')
    form.addEventListener('reset', onReset)
    return () => form.removeEventListener('reset', onReset)
  }, [controlled, p.defaultValue])

  const join = (a: string, b: string) => [a.trimEnd(), b].filter(Boolean).join(a.trim() && b ? ' ' : '')

  const toggleMic = () => {
    if (listening) return dictation.current?.stop()
    setNotice(null)
    setUndo(null)
    base.current = val
    dictation.current = startDictation({
      lang,
      onLive: (t) => set(join(base.current, t)),
      onError: (m) => setNotice(m),
      onDone: async (t) => {
        setListening(false)
        dictation.current = null
        if (!t) return set(base.current)
        setBusy(true)
        const r = await cleanup(t, 'dictation', Boolean(p.sentence))
        setBusy(false)
        set(join(base.current, r.text ?? t))
        setNotice(r.notice)
        field.current?.focus()
      },
    })
    if (dictation.current) setListening(true)
  }

  const improve = async () => {
    if (!val.trim() || busy) return
    setBusy(true)
    setNotice(null)
    const before = val
    const r = await cleanup(before, 'improve', true)
    setBusy(false)
    if (r.text === null) return setNotice(r.notice)
    if (r.text !== before) {
      set(r.text)
      setUndo(before)
    }
    setNotice(r.notice)
  }

  const common = {
    ref: field,
    id: p.id,
    name: p.name,
    value: val,
    maxLength: p.maxLength,
    minLength: p.minLength,
    required: p.required,
    placeholder: listening ? 'Je vous écoute…' : p.placeholder,
    'aria-label': p.ariaLabel,
    autoComplete: p.autoComplete,
    dir: 'auto' as const,
    readOnly: busy,
    onKeyDown: p.onKeyDown,
    onChange: (e: { target: { value: string } }) => {
      setUndo(null)
      set(e.target.value)
    },
  }

  return (
    <div className={`smart-text ${p.multiline ? 'is-multi' : 'is-single'} ${listening ? 'is-listening' : ''} ${busy ? 'is-busy' : ''} ${p.className ?? ''}`}>
      {p.multiline ? <textarea rows={p.rows ?? 3} {...common} /> : <input {...common} />}
      <div className="smart-tools">
        {canDictate && (
          <>
            <select
              className="smart-lang"
              value={lang}
              aria-label="Langue de la dictée"
              disabled={listening}
              onChange={(e) => {
                const l = e.target.value as DictationLang
                setLang(l)
                rememberLang(l)
              }}
            >
              {DICTATION_LANGS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
            <button type="button" className={`smart-btn smart-mic ${listening ? 'on' : ''}`} aria-pressed={listening} aria-label={listening ? 'Arrêter la dictée' : 'Dicter'} title={listening ? 'Arrêter' : 'Dicter'} onClick={toggleMic} disabled={busy}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="9" y="3" width="6" height="12" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" />
              </svg>
            </button>
          </>
        )}
        {member && p.improve !== false && (
          <button type="button" className="smart-btn smart-improve" aria-label="Améliorer le texte" title="Améliorer le texte" onClick={improve} disabled={busy || listening || !val.trim()}>
            ✦
          </button>
        )}
      </div>
      {(busy || notice || undo !== null) && (
        <p className="smart-status" role="status">
          {busy ? 'DALIL met votre texte au propre…' : notice}
          {undo !== null && !busy && (
            <button
              type="button"
              className="auth-link"
              onClick={() => {
                set(undo)
                setUndo(null)
              }}
            >
              Annuler l’amélioration
            </button>
          )}
        </p>
      )}
    </div>
  )
})
