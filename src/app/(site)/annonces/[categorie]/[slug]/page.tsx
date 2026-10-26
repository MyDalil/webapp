import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { categoryLabel, currentMember, getClassified } from '@/modules/annonces'
import { ClassifiedChat, Gallery, ReportForm } from '@/modules/annonces/ui'

export const dynamic = 'force-dynamic'
type Props = { params: Promise<{ categorie: string; slug: string }> }

const day = (iso: string) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Algiers' }).format(new Date(iso))
const since = (iso: string) => new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'Africa/Algiers' }).format(new Date(iso))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await getClassified((await params).slug)
  return a ? { title: `${a.title} — ${a.price} · ${a.place} · DALIL`, description: a.description.slice(0, 160), robots: a.status === 'published' && !a.example ? undefined : { index: false } } : {}
}

export default async function AnnoncePage({ params }: Props) {
  const { categorie, slug } = await params
  const a = await getClassified(slug)
  if (!a || a.category !== categorie) notFound()
  const me = await currentMember()
  const back = `/annonces/${a.category}`
  return (
    <div className="praticien-page container classified-page">
      <Link className="back-link" href={back}>
        ← {categoryLabel(a.category)}
      </Link>
      {a.mine && a.status !== 'published' && (
        <p className="praticien-notice">
          Votre annonce n’est pas visible : {a.statusLabel.toLowerCase()}. <Link href="/mon-compte#annonces">Mes annonces</Link>
        </p>
      )}
      <div className="praticien-layout">
        <div className="praticien-main">
          <Gallery photos={a.gallery} title={a.title} />
          <header className="classified-head">
            <span className={`chip ${a.example ? 'chip-example' : ''}`}>{a.example ? `Exemple · ${a.subLabel}` : a.subLabel}</span>
            <h1>{a.title}</h1>
            <p className="classified-price">{a.price}</p>
            <p className="muted-line">
              {a.place}
              {a.publishedAt ? ` · publiée le ${day(a.publishedAt)}` : ''}
            </p>
          </header>
          {!!a.facts.length && (
            <section className="account-block praticien-facts">
              <h2>Caractéristiques</h2>
              <dl>
                {a.facts.map(([k, v]) => (
                  <div key={k} style={{ display: 'contents' }}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
          <section className="account-block">
            <h2>Description</h2>
            <p className="praticien-bio">{a.description}</p>
          </section>
          <section className="account-block classified-safety">
            <h2>Sécurité</h2>
            <ul>
              <li>Ne payez jamais à l’avance sans avoir vu le bien ou rencontré la personne.</li>
              <li>Rencontrez-vous dans un lieu public. Vérifiez les papiers d’un véhicule ou d’un logement.</li>
              {a.category === 'emploi' && <li>Un employeur sérieux ne demande jamais d’argent à un candidat.</li>}
            </ul>
            {!a.mine && !a.example && a.status === 'published' && <ReportForm id={a.id} />}
          </section>
        </div>
        <aside className="praticien-aside">
          <section className="account-block classified-seller">
            <h2>{a.author.name}</h2>
            <p className="muted-line">
              {a.author.kind === 'pro' ? 'Professionnel' : 'Particulier'} · membre depuis {since(a.author.since)}
            </p>
          </section>
          {a.example ? (
            <section className="account-block classified-example">
              <h2>Annonce d’exemple</h2>
              <p>Elle montre à quoi ressemble une annonce DALIL. Elle ne peut pas être contactée et disparaît dès qu’une vraie annonce est publiée dans ce type.</p>
              <Link className="button primary" href={`/annonces/deposer?categorie=${a.category}`}>
                Déposer une vraie annonce
              </Link>
            </section>
          ) : a.mine ? (
            <section className="account-block">
              <h2>C’est votre annonce</h2>
              <p className="muted-line">Les messages reçus sont dans votre espace.</p>
              <Link className="button primary" href="/mon-compte#annonces">
                Mes annonces et messages
              </Link>
            </section>
          ) : (
            <ClassifiedChat id={a.id} other={a.author.name} signedIn={!!me} loginHref={`/connexion/particulier?next=${encodeURIComponent(`/annonces/${a.category}/${a.slug}#contact`)}`} closed={a.status !== 'published'} />
          )}
        </aside>
      </div>
    </div>
  )
}
