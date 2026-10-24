'use client'

import { useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Icon } from '@/platform/ui/Icon'
import { toast } from '@/platform/shell/toast'
import { simpleClean } from '@/platform/ai/clean'
import { preferredLang, startDictation, type Dictation } from '@/platform/ui/speech'
import { ACCEPT_DOC, setPendingDoc } from './pendingDoc'

/**
 * Suggestions sous la barre (validées par Rad, 2026-10-21) : hors tourisme d’abord, selon les recherches
 * des Algériens (santé, artisans, papiers). Chaque lien ouvre directement le bon résultat.
 */
const SUGGESTIONS: [href: string, label: string][] = [
  ['/praticiens?specialite=dentiste&wilaya=16', 'Dentiste à Alger'],
  ['/praticiens?specialite=pediatrie', 'Pédiatre'],
  ['/services/bricolage?activite=plomberie', 'Plombier'],
  ['/annuaire/sante-soins?category=Pharmacies', 'Pharmacie'],
  ['/guides/documents-et-demarches', 'Passeport et papiers'],
  ['/annonces/immobilier?type=appartement&transaction=location', 'Location d’appartement'],
  ['/annuaire/mosquees-priere?category=Mosqu%C3%A9es', 'Mosquée'],
]

/** Barre de recherche du hero de la maquette, reliée à la recherche guidée du prototype. */
export function HomeSearch() {
  const router = useRouter()
  const ref = useRef<HTMLInputElement>(null)
  const docRef = useRef<HTMLInputElement>(null)
  const dictation = useRef<Dictation | null>(null)
  const [listening, setListening] = useState(false)

  function submit(e: FormEvent) {
    e.preventDefault()
    dictation.current?.stop()
    const q = ref.current?.value.trim()
    router.push(q ? `/recherche?q=${encodeURIComponent(q)}` : '/recherche')
  }

  // Trombone : choisir le document ici, il est lu sur la recherche guidée.
  function pickDoc(f?: File) {
    if (!f) return
    setPendingDoc(f)
    router.push('/recherche')
  }

  // Micro : dictée en direct dans le champ, nettoyée à la fin.
  function mic() {
    if (listening) return dictation.current?.stop()
    const input = ref.current
    if (!input) return
    const base = input.value.trim()
    dictation.current = startDictation({
      lang: preferredLang(),
      onLive: (t) => (input.value = [base, t].filter(Boolean).join(' ')),
      onError: (m) => toast(m),
      onDone: (t) => {
        setListening(false)
        dictation.current = null
        input.value = [base, t ? simpleClean(t) : ''].filter(Boolean).join(' ')
        input.focus()
      },
    })
    if (dictation.current) setListening(true)
  }

  return (
    <>
    <form className="search-bar" onSubmit={submit}>
      <span>
        <Icon name="search" />
      </span>
      <label className="sr-only" htmlFor="home-search">
        Que recherchez-vous ?
      </label>
      <input id="home-search" ref={ref} name="search" placeholder="Un lieu, une démarche, une activité…" />
      <input ref={docRef} type="file" accept={ACCEPT_DOC} hidden onChange={(e) => pickDoc(e.target.files?.[0])} />
      <button type="button" className="search-attach" aria-label="Joindre un document" title="PDF ou fichier texte, 5 Mo maximum" onClick={() => docRef.current?.click()}>
        <Icon name="file" />
      </button>
      <button type="button" className={`search-mic ${listening ? 'recording' : ''}`} aria-pressed={listening} aria-label={listening ? 'Arrêter la dictée' : 'Recherche vocale'} onClick={mic}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="9" y="3" width="6" height="12" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" />
        </svg>
      </button>
      <button className="button primary" type="submit">
        Rechercher
      </button>
    </form>
    <p className="xp-suggest">
      <span>Par exemple :</span>
      {SUGGESTIONS.map(([href, label]) => (
        <Link key={href} href={href}>
          {label}
        </Link>
      ))}
    </p>
    </>
  )
}
