'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

export function openLogin() {
  window.dispatchEvent(new Event('dalil:login'))
}

/**
 * Fenêtre « Connexion » de la maquette, ouverte quand une action demande un compte (Enregistrer…).
 * Elle mène au vrai compte membre et ramène ensuite sur la page en cours.
 */
export function LoginDialog() {
  const ref = useRef<HTMLDialogElement>(null)
  const [here, setHere] = useState('/')

  useEffect(() => {
    const open = () => {
      setHere(window.location.pathname + window.location.search)
      ref.current?.showModal()
    }
    window.addEventListener('dalil:login', open)
    return () => window.removeEventListener('dalil:login', open)
  }, [])

  const next = encodeURIComponent(here)
  return (
    <dialog
      className="login-dialog"
      ref={ref}
      onClick={(e) => {
        const r = ref.current!.getBoundingClientRect()
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) ref.current?.close()
      }}
    >
      <button className="dialog-close" type="button" aria-label="Fermer" onClick={() => ref.current?.close()}>
        ×
      </button>
      <div className="dialog-brand">
        <span className="brand-mark">D</span>
        <strong>DALIL</strong>
      </div>
      <p className="eyebrow">Votre espace personnel</p>
      <h2>Retrouvez ce qui compte pour vous.</h2>
      <p>Enregistrez vos adresses, suivez vos démarches et retrouvez vos contributions.</p>
      <Link className="button primary wide" href={`/connexion/particulier?tab=signup&next=${next}`} onClick={() => ref.current?.close()}>
        Créer mon compte gratuitement
      </Link>
      <Link className="button outline wide" href={`/connexion/particulier?next=${next}`} onClick={() => ref.current?.close()}>
        Se connecter
      </Link>
      <button className="text-button" type="button" onClick={() => ref.current?.close()}>
        Continuer sans compte
      </button>
    </dialog>
  )
}
