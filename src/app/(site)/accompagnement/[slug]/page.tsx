import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { NO_GUARANTEE, offerState, packBySlug } from '@/modules/accompagnement'
import { RequestForm, Transparency } from '@/modules/accompagnement/ui'

type Props = { params: Promise<{ slug: string }> }
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pack = await packBySlug((await params).slug)
  return pack ? { title: `${pack.title} · DALIL`, description: pack.summary, robots: { index: false } } : {}
}

/** Fiche d’un pack et demande (liste d’attente tant que l’offre n’est pas ouverte). */
export default async function PackPage({ params }: Props) {
  const pack = await packBySlug((await params).slug)
  if (!pack) notFound()
  const state = await offerState()
  const waitlist = state.mode !== 'ouvert'
  return (
    <article className="sr ac-page">
      <header className="sr-head">
        <nav className="ac-crumbs" aria-label="Fil d’Ariane">
          <Link href="/demarches">Démarches</Link> › <Link href="/accompagnement">Accompagnement</Link> › <span>{pack.demarche}</span>
        </nav>
        <h1>{pack.title}</h1>
        <p className="sr-meta">{pack.summary}</p>
      </header>
      <Transparency />
      <section className="ac-choice is-single" aria-label="Le pack">
        <article className="ac-option is-premium">
          <p className="ac-price">
            <b>{pack.price.main}</b>
            {pack.price.sub && <small>{pack.price.sub}</small>}
          </p>
          <ul className="ac-includes">
            {pack.includes.map((i) => (
              <li key={i.item}>{i.item}</li>
            ))}
          </ul>
          <p className="sr-note">
            {state.paymentEnabled ? 'Paiement en ligne sécurisé après l’appel avec votre conseiller.' : 'Rien à payer aujourd’hui : le paiement en ligne n’est pas encore ouvert. Le conseiller vous indique les modalités.'}
          </p>
          <p className="sr-note">{NO_GUARANTEE}</p>
        </article>
      </section>
      <section className="sr-group" aria-label="Demande">
        <h2>{waitlist ? 'Être prévenu à l’ouverture' : 'Demander cet accompagnement'}</h2>
        {waitlist && <p className="sr-note">Cet accompagnement ouvre bientôt. Laissez vos coordonnées : nous vous écrivons dès l’ouverture.</p>}
        <RequestForm pack={pack.slug} waitlist={waitlist} />
      </section>
      <p className="sr-note">
        Vous préférez faire seul ? <Link href={pack.guide}>Le guide gratuit</Link> donne toutes les étapes.
      </p>
    </article>
  )
}
