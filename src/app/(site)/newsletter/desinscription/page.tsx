import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Se désinscrire', robots: { index: false } }

export default async function Unsubscribe({ searchParams }: { searchParams: Promise<{ token?: string; fait?: string }> }) {
  const { token = '', fait } = await searchParams
  const done = fait === '1'
  const failed = fait === '0'
  return (
    <section className="page-intro container compact">
      <p className="eyebrow">Newsletter</p>
      <h1>{done ? 'Vous êtes désinscrit.' : failed ? 'Ce lien n’est pas valable.' : 'Se désinscrire des nouvelles de DALIL ?'}</h1>
      <p>
        {done
          ? 'Vous ne recevrez plus la newsletter. Les emails liés à vos demandes (contribution, candidature) restent envoyés.'
          : failed
            ? 'Écrivez-nous à salam@mydalil.com et nous retirerons votre adresse.'
            : 'Un clic suffit. Vous pourrez vous réinscrire à tout moment depuis le pied de page.'}
      </p>
      <div className="button-row">
        {!done && !failed ? (
          <form method="post" action={`/api/subscribers/unsubscribe?token=${encodeURIComponent(token)}`}>
            <button className="button primary" type="submit">
              Me désinscrire
            </button>
          </form>
        ) : (
          <Link className="button primary" href="/">
            Retour à l’accueil
          </Link>
        )}
      </div>
    </section>
  )
}
