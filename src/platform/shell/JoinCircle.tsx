'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

/** Cercle « Créer mon compte gratuitement » : suit la navigation tant que le visiteur n’a pas de compte. */
export function JoinCircle() {
  const pathname = usePathname()
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    fetch('/api/compte', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => setHidden(Boolean(me?.member)))
      .catch(() => {})
  }, [])
  if (hidden || pathname?.startsWith('/connexion')) return null
  return (
    <Link href="/connexion/particulier?tab=signup" className="join-circle" aria-label="Créer mon compte gratuitement">
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
