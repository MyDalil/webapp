import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Inscription à la newsletter', robots: { index: false } }

export default async function NewsletterConfirmation({ searchParams }: { searchParams: Promise<{ lien?: string }> }) {
  const invalid = (await searchParams).lien === 'invalide'
  return (
    <section className="page-intro container compact">
      <p className="eyebrow">Newsletter</p>
      <h1>{invalid ? 'Ce lien n’est plus valable.' : 'Inscription confirmée.'}</h1>
      <p>
        {invalid
          ? 'Il a peut-être déjà été utilisé. Vous pouvez vous réinscrire depuis le pied de page.'
          : 'Merci. Vous recevrez les nouvelles de DALIL : ouvertures, nouveaux guides et adresses vérifiées.'}
      </p>
      <div className="button-row">
        <Link className="button primary" href="/">
          Retour à l’accueil
        </Link>
        <Link className="button outline" href="/annuaire">
          Explorer l’annuaire
        </Link>
      </div>
    </section>
  )
}
