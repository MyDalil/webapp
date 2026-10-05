import Link from 'next/link'

export default function NotFound() {
  return (
    <section className="page-intro container compact">
      <p className="eyebrow">Page introuvable</p>
      <h1>Cette page n’existe pas ou a été déplacée.</h1>
      <p>Revenez à l’accueil ou demandez à DALIL ce que vous cherchez.</p>
      <div className="button-row">
        <Link className="button primary" href="/">
          Retour à l’accueil
        </Link>
        <Link className="button outline" href="/recherche">
          Rechercher
        </Link>
      </div>
    </section>
  )
}
