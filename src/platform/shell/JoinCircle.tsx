'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

/** Cercle « Créer mon compte gratuitement » : suit la navigation tant que le visiteur n’a pas de compte. */
export function JoinCircle() {
  const pathname = usePathname()
  const [hidden, setHidden] = useState(false)
  // Mobile : le cercle s’efface quand on descend (lecture) et revient quand on remonte.
  const [away, setAway] = useState(false)
  useEffect(() => {
    let last = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      if (Math.abs(y - last) < 8) return
      setAway(y > last && y > 120)
      last = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => {
    fetch('/api/compte', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => setHidden(Boolean(me?.member)))
      .catch(() => {})
  }, [])
  // Fiches détaillées : un seul bouton flottant (l’assistant) ; la bulle d’inscription s’efface.
  const detail = /^\/(adresses|prestataires|missions)\/|^\/praticiens\/[^/]+|^\/annonces\/[^/]+\/[^/]+|^\/guides\/[^/]+/.test(pathname ?? '')
  if (hidden || detail || pathname?.startsWith('/connexion')) return null
  return (
    <Link href="/connexion/particulier?tab=signup" className={`join-circle${away ? ' is-away' : ''}`} aria-label="Créer mon compte gratuitement">
      <span>
        Créer
        <br />
        mon compte
        <br />
        <small>gratuitement</small>
      </span>
    </Link>
  )
}
