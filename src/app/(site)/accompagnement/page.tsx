import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { listPacks } from '@/modules/accompagnement'
import { Transparency, Why } from '@/modules/accompagnement/ui'
import { Icon } from '@/platform/ui/Icon'

export const metadata: Metadata = {
  title: 'Accompagnement aux démarches · DALIL',
  description: 'Un conseiller vous aide à préparer et vérifier votre dossier. Les démarches restent gratuites sur les sites officiels.',
  robots: { index: false },
}
export const dynamic = 'force-dynamic'

/** Liste des packs. Introuvable tant que l’offre est cachée (production avant le lancement). */
export default async function Accompagnement() {
  const packs = await listPacks()
  if (!packs.length) notFound()
  return (
    <section className="sr ac-page" aria-label="Accompagnement">
      <header className="sr-head">
        <p className="sr-eyebrow">Accompagnement</p>
        <h1>Un conseiller pour votre démarche.</h1>
        <p className="sr-meta">Le guide reste gratuit. Le pack ajoute une aide humaine et la vérification de votre dossier.</p>
      </header>
      <Transparency />
      <section className="sr-group" aria-label="Packs">
        <h2>Les packs</h2>
        <ul className="sr-list">
          {packs.map((p) => (
            <li key={p.slug}>
              <Link href={`/accompagnement/${p.slug}`} className="sr-row is-wrap">
                <span className="sr-icon" aria-hidden="true">
                  <Icon name="check" />
                </span>
                <span className="sr-text">
                  <b>{p.demarche}</b>
                  <small>{p.summary}</small>
                </span>
                <span className="ac-row-price">{p.price.main}</span>
                <span className="sr-chev" aria-hidden="true">›</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <Why />
    </section>
  )
}
