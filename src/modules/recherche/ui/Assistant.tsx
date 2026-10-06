'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from '@/platform/shell/toast'

/** Barre « Demandez à DALIL » de la maquette : oriente vers la recherche guidée. */
export function Assistant() {
  const router = useRouter()
  const path = usePathname()
  const [expanded, setExpanded] = useState(false)
  const [recording, setRecording] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => setExpanded(false), [path])

  function submit(e: FormEvent) {
    e.preventDefault()
    const q = inputRef.current?.value.trim()
    if (!q) return toast('Posez votre question à DALIL')
    inputRef.current!.value = ''
    router.push(`/recherche?q=${encodeURIComponent(q)}`)
  }

  function mic() {
    type Rec = { lang: string; onresult: (e: { results: { 0: { 0: { transcript: string } } } }) => void; onend: () => void; start: () => void }
    const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec }
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!Ctor) return toast('Dictée indisponible sur ce navigateur')
    const rec = new Ctor()
    rec.lang = 'fr-FR'
    rec.onresult = (e) => {
      if (inputRef.current) inputRef.current.value = `${inputRef.current.value} ${e.results[0][0].transcript}`.trim()
    }
    rec.onend = () => setRecording(false)
    try {
      rec.start()
      setRecording(true)
      toast('Écoute en cours…')
    } catch {
      toast('Microphone indisponible')
    }
  }

  if (path === '/recherche') return null

  return (
    <div className={`assistant-dock ${expanded ? 'expanded' : ''}`}>
      <button className="assistant-orb" type="button" aria-label="Ouvrir l’assistant DALIL" onClick={() => setExpanded(!expanded)}>
        <span aria-hidden="true">✦</span>
      </button>
      <form className="assistant-bar" onSubmit={submit}>
        <label className="sr-only" htmlFor="assistant-input">
          Que recherchez-vous ?
        </label>
        <input id="assistant-input" ref={inputRef} name="query" placeholder="Demandez à DALIL…" autoComplete="off" />
        <button className="dock-icon" type="button" aria-label="Ajouter un document" onClick={() => router.push('/recherche')}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m21.4 11.6-8.9 8.9a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 1 1 5.7 5.7l-9.2 9.2a2 2 0 1 1-2.8-2.8l8.5-8.5" />
          </svg>
        </button>
        <button className={`dock-icon ${recording ? 'recording' : ''}`} type="button" aria-label="Parler à DALIL" onClick={mic}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="9" y="3" width="6" height="12" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" />
          </svg>
        </button>
        <button className="assistant-send" type="submit" aria-label="Envoyer">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m5 12 14-7-4 14-3-6-7-1Z" />
          </svg>
        </button>
      </form>
    </div>
  )
}
