import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { GUIDE_VISUALS, guideView } from '@/modules/contenus'
import { offerState, packForGuide } from '@/modules/accompagnement'
import { Choice, Transparency } from '@/modules/accompagnement/ui'
import { FavoriteButton } from '@/modules/membres/ui'
import { GUIDES } from '@/platform/referentiel/catalog'
import { PHOTOS } from '@/platform/referentiel/photos'
import { Icon } from '@/platform/ui/Icon'
import { Visual } from '@/platform/ui/Visual'

type Props = { params: Promise<{ slug: string }> }
export const revalidate = 3600
export const dynamicParams = false
export const generateStaticParams = () => GUIDES.map((g) => ({ slug: g.slug }))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = await guideView((await params).slug)
  return g ? { title: `${g.title} · DALIL`, description: g.lead } : {}
}

const dateFr = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

/** Guide pratique au format « application » (même modèle que les fiches de démarche). Contenu : prototype validé. */
export default async function GuidePage({ params }: Props) {
  const { slug } = await params
  const g = await guideView(slug)
  if (!g) notFound()
  const v = GUIDE_VISUALS[slug] ?? { icon: 'file', tone: 'vert' as const }
  const pack = await packForGuide(`/guides/${slug}`)
  const open = (await offerState()).mode === 'ouvert'
  const others = GUIDES.filter((x) => x.slug !== slug && x.category === GUIDES.find((y) => y.slug === slug)?.category).slice(0, 6)
  return (
    <article className="sr dm-page">
      <nav className="ac-crumbs dm-crumbs" aria-label="Fil d’Ariane">
        <Link href="/">Accueil</Link> › <Link href="/guides">Guides</Link> › <span>{g.title}</span>
      </nav>

      <header className="dm-hero">
        <div className="dm-hero-media">
          <Visual photo={v.photo} icon={v.icon} tone={v.tone} className="dm-hero-visual" eager />
          <Link href="/guides" className="dm-round" aria-label="Tous les guides">
            ‹
          </Link>
          {v.photo && <small className="dm-credit">{PHOTOS[v.photo].credit}</small>}
        </div>
        <div className="dm-hero-text">
          <p className="sr-eyebrow">{g.label}</p>
          <h1>{g.title}</h1>
          <p className="sr-meta">{g.lead}</p>
          <span className="dm-fav">
            <FavoriteButton itemType="guide" itemKey={slug} label={g.title} />
          </span>
        </div>
      </header>

      {g.disclosure && <p className="dm-note">{g.disclosure}</p>}

      <section className="sr-group" id="guide" aria-label="Étape par étape">
        <h2>Étape par étape</h2>
        <ol className="ac-steps">
          {g.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </section>

      {pack && (
        <>
          <Transparency />
          <Choice pack={pack} freeHref="#guide" outline={g.steps.slice(0, 4).map((s) => s.split(/[,:;.]/)[0])} open={open} />
        </>
      )}

      {g.sources.length > 0 && (
        <section className="sr-group" aria-label="Sources et interlocuteurs">
          <h2>Sources et interlocuteurs</h2>
          <ul className="sr-list">
            {g.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="sr-row is-wrap">
                  <span className="sr-icon" aria-hidden="true">
                    <Icon name="check" />
                  </span>
                  <span className="sr-text">
                    <b>{s.title}</b>
                    <small>
                      {s.publisher}
                      {s.date ? ` · consulté le ${dateFr(s.date)}` : ''}
                    </small>
                  </span>
                  <span />
                  <span className="sr-chev" aria-hidden="true">›</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="sr-note">Ces références éclairent le sujet ; elles ne certifient aucun établissement recommandé par DALIL.</p>
        </section>
      )}

      <div className="dm-actions">
        <Link href="/onboarding" className="sr-pill is-primary">
          Construire mon parcours
        </Link>
        <Link href="/proposer" className="sr-pill">
          Signaler une information à compléter
        </Link>
      </div>

      {others.length > 0 && (
        <section className="sr-group" aria-label="Autres guides">
          <h2>Dans la même rubrique</h2>
          <ul className="dm-cards swipe">
            {others.map((o) => {
              const ov = GUIDE_VISUALS[o.slug] ?? { icon: 'file', tone: 'vert' as const }
              return (
                <li key={o.slug} className="dm-card">
                  <Link href={`/guides/${o.slug}`} className="dm-card-main">
                    <span className="dm-card-media">
                      <Visual photo={ov.photo} icon={ov.icon} tone={ov.tone} />
                      <span className="dm-card-overlay">
                        <b>{o.title}</b>
                      </span>
                    </span>
                    <span className="dm-card-text">
                      <small>{o.summary}</small>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </article>
  )
}
