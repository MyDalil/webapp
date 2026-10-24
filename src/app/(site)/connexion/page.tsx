import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Connexion · DALIL', description: 'Accédez à votre espace particulier ou professionnel DALIL.' }

export default function Connexion() {
  return (
    <section className="auth-page container">
      <p className="eyebrow">Connexion</p>
      <h1>Bienvenue sur DALIL.</h1>
      <p className="auth-lead">Un seul compte, gratuit, pour réserver vos rendez-vous, garder vos favoris et suivre vos démarches.</p>
      <div className="auth-choice">
        <Link href="/connexion/particulier" className="auth-card">
          <span className="auth-card-kicker">Particulier</span>
          <h2>Mon espace</h2>
          <p>Rendez-vous, favoris, démarches et contributions.</p>
          <b>Se connecter ou créer un compte →</b>
        </Link>
        <Link href="/connexion/professionnel" className="auth-card">
          <span className="auth-card-kicker">Professionnel</span>
          <h2>Espace pro</h2>
          <p>Praticiens et établissements : fiche, agenda, demandes et avis.</p>
          <b>Se connecter ou créer un compte →</b>
        </Link>
      </div>
    </section>
  )
}
