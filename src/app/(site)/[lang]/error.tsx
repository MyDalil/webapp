'use client'

import { useEffect } from 'react'
import Link from '@/platform/ui/Link'

/** Erreur inattendue sur une page : message clair, nouvel essai, retour à l’accueil. Jamais d’écran blanc. */
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <section className="page-intro container compact" role="alert">
      <p className="eyebrow">Un problème est survenu</p>
      <h1>Cette page ne s’est pas affichée correctement.</h1>
      <p>Réessayez. Si le problème continue, revenez à l’accueil : l’équipe DALIL est prévenue.</p>
      <div className="button-row">
        <button type="button" className="button primary" onClick={reset}>
          Réessayer
        </button>
        <Link className="button outline" href="/">
          Retour à l’accueil
        </Link>
      </div>
      {error.digest ? <p className="muted" style={{ fontSize: 12 }}>Référence : {error.digest}</p> : null}
    </section>
  )
}
