import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { NO_GUARANTEE, offerState, packBySlug } from '@/modules/accompagnement'
import { Booking, Transparency } from '@/modules/accompagnement/ui'
import { demarcheBySlug } from '@/modules/contenus'
import { Icon } from '@/platform/ui/Icon'

type Props = { params: Promise<{ slug: string }> }
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pack = await packBySlug((await params).slug)
  return pack ? { title: `${pack.title} · DALIL`, description: pack.summary, robots: { index: false } } : {}
}

/** « Votre accompagnement » (maquette validée par Rad) : le pack, le nombre de personnes, la tarification, le paiement, la demande. */
export default async function PackPage({ params }: Props) {
  const pack = await packBySlug((await params).slug)
  if (!pack) notFound()
  const state = await offerState()
  const d = pack.guide.startsWith('/demarches/') ? demarcheBySlug(pack.guide.split('/')[2]) : null
  return (
    <article className="sr ac-page ac-narrow">
      <header className="ac-topbar">
        <Link href={pack.guide} className="dm-round is-static" aria-label={`Retour : ${pack.demarche}`}>
          ‹
        </Link>
        <p>Votre accompagnement</p>
        <span aria-hidden="true" />
      </header>
      <section className="ac-card ac-pack-card" aria-label="Le pack">
        {/* eslint-disable-next-line @next/next/no-img-element -- illustration SVG locale */}
        <img className="ac-pack-img" src={d?.image ?? '/images/demarches/ccr.svg'} alt="" width={640} height={360} />
        <div>
          <h1>{pack.title}</h1>
          {d && (
            <p className="dm-where">
              <Icon name="pin" /> {d.where}
            </p>
          )}
          <p className="sr-note">{pack.summary}</p>
        </div>
      </section>
      <section className="ac-card" aria-label="Ce qui est inclus">
        <b>Ce qui est inclus</b>
        <ul className="ac-includes">
          {pack.includes.map((i) => (
            <li key={i.item}>{i.item}</li>
          ))}
        </ul>
      </section>
      <Booking pack={pack.slug} perPerson={pack.perPerson} priceEur={pack.priceEur} priceLabel={pack.price.main} waitlist={state.mode !== 'ouvert'} paymentEnabled={state.paymentEnabled} open={state.mode === 'ouvert'} />
      <Transparency />
      <p className="sr-note">{NO_GUARANTEE}</p>
      <p className="sr-note">
        Vous préférez faire seul ? <Link href={pack.guide}>Le guide gratuit</Link> donne toutes les étapes.
      </p>
    </article>
  )
}
