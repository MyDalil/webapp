import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AuthPanel } from '@/modules/membres/ui'

export const metadata: Metadata = { title: 'Connexion', description: 'Connectez-vous ou créez votre compte DALIL avec un code reçu par email.', robots: { index: false } }

/** Une seule entrée (ordinateur et mobile) : email puis code. Particulier ou professionnel se choisit à l’inscription. */
export default function Connexion() {
  return (
    <section className="auth-page auth-narrow auth-one container">
      <p className="eyebrow">Connexion</p>
      <h1>Bienvenue sur DALIL.</h1>
      <p className="auth-lead">Un seul compte, gratuit, pour réserver vos rendez-vous, garder vos favoris et gérer votre activité.</p>
      <Suspense>
        <AuthPanel />
      </Suspense>
    </section>
  )
}
