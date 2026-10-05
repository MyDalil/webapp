'use client'

import { useRef, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from './Icon'
import { toast } from './shell/toast'

/** Barre de recherche du hero de la maquette, reliée à la recherche guidée du prototype. */
export function HomeSearch() {
  const router = useRouter()
  const ref = useRef<HTMLInputElement>(null)
  function submit(e: FormEvent) {
    e.preventDefault()
    const q = ref.current?.value.trim()
    router.push(q ? `/recherche?q=${encodeURIComponent(q)}` : '/recherche')
  }
  return (
    <form className="search-bar" onSubmit={submit}>
      <span>
        <Icon name="search" />
      </span>
      <label className="sr-only" htmlFor="home-search">
        Que recherchez-vous ?
      </label>
      <input id="home-search" ref={ref} name="search" placeholder="Un lieu, une démarche, une activité…" />
      <button type="button" className="search-attach" aria-label="Joindre un document" onClick={() => router.push('/recherche')}>
        <Icon name="file" />
      </button>
      <button type="button" className="search-mic" aria-label="Recherche vocale" onClick={() => toast('Dictez votre demande depuis la recherche guidée')}>
        <span className="mic-dot"></span>
      </button>
      <button className="button primary" type="submit">
        Rechercher
      </button>
    </form>
  )
}
