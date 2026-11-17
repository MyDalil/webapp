import type { Metadata } from 'next'
import Link from '@/platform/ui/Link'
import { notFound } from 'next/navigation'
import { GUIDE_VISUALS, guideView } from '@/modules/contenus'
import { FavoriteButton } from '@/modules/membres/ui'
import { getPlaceCounts, searchPlaces } from '@/modules/annuaire'
import { CategoryGrid, PlaceCards } from '@/modules/annuaire/ui'
import { GuideTabs } from './GuideTabs'
import { GUIDES, SECTORS } from '@/platform/referentiel/catalog'
import { categoryPath } from '@/platform/referentiel/slug'
import { PHOTOS } from '@/platform/referentiel/photos'
import { Icon, IconLabel } from '@/platform/ui/Icon'

/** Couleurs des numéros d’étape : même palette que les cases de catégories. */
const TONES = ['#16a34a', '#2563eb', '#ea580c', '#7c3aed', '#db2777', '#0891b2', '#ca8a04', '#dc2626']
import { Visual } from '@/platform/ui/Visual'
import { XpHero } from '@/platform/ui/Xp'

type Props = { params: Promise<{ slug: string }> }
export const revalidate = 3600
export const dynamicParams = false
export const generateStaticParams = () => GUIDES.map((g) => ({ slug: g.slug }))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = await guideView((await params).slug)
  return g ? { title: `${g.title}`, description: g.lead } : {}
}

/** Pas de compteurs sur les listes Administrations (décision de Rad, oct. 2026). */
const NO_COUNT = new Set(['administrations-services-publics'])

const dateFr = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

/** Guide pratique au format « application » (même modèle que les fiches de démarche). Contenu : prototype validé. */
export default async function GuidePage({ params }: Props) {
  const { slug } = await params
  const g = await guideView(slug)
  if (!g) notFound()
  const v = GUIDE_VISUALS[slug] ?? { icon: 'file', tone: 'vert' as const }
  const others = GUIDES.filter((x) => x.slug !== slug && x.category === GUIDES.find((y) => y.slug === slug)?.category).slice(0, 6)
  // Annuaire lié au guide (ex. « École et vie de famille » → Éducation & Formation) : catégories non vides, puis les adresses les mieux classées.
  const linked = SECTORS.filter((s) => s.guides.includes(slug))
  const counts = linked.length ? await getPlaceCounts() : null
  const categories = linked.flatMap((s) => s.categories.filter((c) => (counts?.category[c] ?? 0) > 0).map((c) => ({ sector: s, category: c, n: counts!.category[c] })))
  const main = linked.find((s) => (counts?.sector[s.slug] ?? 0) > 0)
  const top = main ? await searchPlaces({ sector: main.slug }, 6) : null
  // Date de consultation commune à toutes les sources : affichée une seule fois, en tête.
  const dates = [...new Set(g.sources.map((x) => x.date).filter(Boolean))]
  const sourceDate = dates.length === 1 && g.sources.every((x) => x.date) ? dates[0]! : null
  const counted = categories.reduce((t, c) => t + (NO_COUNT.has(c.sector.slug) ? 0 : c.n), 0)
  const tabs = [
    { id: 'etapes', label: 'Étapes', n: g.steps.length },
    ...(categories.length ? [{ id: 'adresses', label: 'Adresses', n: categories.length }] : []),
    ...(g.sources.length ? [{ id: 'sources', label: 'Sources', n: g.sources.length }] : []),
  ]
  return (
    <article className="xp g-page">
      <XpHero compact photo={v.photo ? PHOTOS[v.photo].src : undefined} credit={v.photo ? PHOTOS[v.photo].credit : null} eyebrow={g.label} title={g.title} lead={g.lead} back={{ href: '/guides', label: 'Tous les guides' }}>
        <span className="dm-fav is-light">
          <FavoriteButton itemType="guide" itemKey={slug} label={g.title} />
        </span>
      </XpHero>
      <GuideTabs tabs={tabs} />
      <div className="container xp-narrow xp-body">
      <section className="sr-group" id="etapes" aria-label="Étape par étape">
        <h2>En {g.steps.length} étapes</h2>
        <ol className="sr-steps g-steps swipe">
          {g.steps.map((s, i) => (
            <li key={s} style={{ ['--rc' as string]: TONES[i % TONES.length] }}>
              <b aria-hidden="true">{i + 1}</b>
              <small>{s}</small>
            </li>
          ))}
        </ol>
        {g.disclosure && (
          <p className="g-note">
            <Icon name="shield" />
            {g.disclosure}
          </p>
        )}
      </section>
      {categories.length > 0 && (
        <section className="sr-group" id="adresses" aria-label="Adresses DALIL">
          <div className="g-head">
            <h2>Trouver une adresse</h2>
            {main && (
              <Link href={`/annuaire/${main.slug}`} className="g-more">
                Tout {main.title} ›
              </Link>
            )}
          </div>
          <CategoryGrid items={categories.map(({ sector, category, n }) => ({ sector: sector.slug, category, n: NO_COUNT.has(sector.slug) ? undefined : n }))} all={main ? { href: `/annuaire/${main.slug}`, n: counted || undefined } : undefined} />
          {top && top.places.length > 0 && (
            <>
              <h3 className="g-sub">À découvrir</h3>
              <PlaceCards places={top.places} />
            </>
          )}
        </section>
      )}
      {g.sources.length > 0 && (
        <section className="sr-group" id="sources" aria-label="Sources et interlocuteurs">
          <div className="g-head">
            <h2>Sources officielles</h2>
            {sourceDate && <small>Consultées le {dateFr(sourceDate)}</small>}
          </div>
          <ul className="sr-list g-sources swipe">
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
                      {s.date && s.date !== sourceDate ? ` · consulté le ${dateFr(s.date)}` : ''}
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
      <div className="g-cta">
        <div>
          <h2>Votre situation est particulière&#8239;?</h2>
          <p>Construisez votre parcours, ou signalez une information à compléter.</p>
        </div>
        <div className="dm-actions">
          <Link href="/onboarding" className="sr-pill is-primary">
            <IconLabel label="Construire mon parcours" icon="pin" />
          </Link>
          <Link href="/proposer" className="sr-pill">
            <IconLabel label="Signaler une information à compléter" icon="clipboard" />
          </Link>
        </div>
      </div>

      {others.length > 0 && (
        <section className="sr-group" aria-label="Autres guides">
          <h2>Dans la même rubrique</h2>
          <ul className="dm-cards g-guides swipe">
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
      </div>
    </article>
  )
}
