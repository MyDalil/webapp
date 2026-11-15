import type { Metadata } from 'next'
import Link from '@/platform/ui/Link'
import { notFound } from 'next/navigation'
import { GUIDE_VISUALS, guideView } from '@/modules/contenus'
import { offerState, packForGuide } from '@/modules/accompagnement'
import { Choice, Transparency } from '@/modules/accompagnement/ui'
import { FavoriteButton } from '@/modules/membres/ui'
import { getPlaceCounts, searchPlaces } from '@/modules/annuaire'
import { PlacePanel } from '@/modules/annuaire/ui'
import { GUIDES, SECTORS } from '@/platform/referentiel/catalog'
import { categoryPath } from '@/platform/referentiel/slug'
import { PHOTOS } from '@/platform/referentiel/photos'
import { Icon, IconLabel } from '@/platform/ui/Icon'
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

/** Pictogramme d’une catégorie liée ; à défaut, l’épingle. */
const CATEGORY_ICON: Record<string, string> = {
  Crèches: 'baby',
  Écoles: 'school',
  Universités: 'books',
  'Formation professionnelle': 'briefcase',
  'Écoles de langues': 'globe',
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
  const pack = await packForGuide(`/guides/${slug}`)
  const open = (await offerState()).mode === 'ouvert'
  const others = GUIDES.filter((x) => x.slug !== slug && x.category === GUIDES.find((y) => y.slug === slug)?.category).slice(0, 6)
  // Annuaire lié au guide (ex. « École et vie de famille » → Éducation & Formation) : catégories non vides, puis les adresses les mieux classées.
  const linked = SECTORS.filter((s) => s.guides.includes(slug))
  const counts = linked.length ? await getPlaceCounts() : null
  const categories = linked.flatMap((s) => s.categories.filter((c) => (counts?.category[c] ?? 0) > 0).map((c) => ({ sector: s, category: c, n: counts!.category[c] })))
  const main = linked.find((s) => (counts?.sector[s.slug] ?? 0) > 0)
  const top = main ? await searchPlaces({ sector: main.slug }, 6) : null
  return (
    <article className="xp">
      <XpHero compact photo={v.photo ? PHOTOS[v.photo].src : undefined} credit={v.photo ? PHOTOS[v.photo].credit : null} eyebrow={g.label} title={g.title} lead={g.lead} back={{ href: '/guides', label: 'Tous les guides' }}>
        <span className="dm-fav is-light">
          <FavoriteButton itemType="guide" itemKey={slug} label={g.title} />
        </span>
      </XpHero>
      <div className="container xp-narrow xp-body">
      {g.disclosure && <p className="dm-note">{g.disclosure}</p>}

      <section className="sr-group" id="guide" aria-label="Étape par étape">
        <h2>Étape par étape</h2>
        <ol className="ac-steps">
          {g.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </section>

      {categories.length > 0 && (
        <section className="sr-group" aria-label="Adresses DALIL">
          <h2>Trouver une adresse</h2>
          <p className="sr-note">Listes par wilaya, avec recherche, filtres et carte.</p>
          <ul className="sr-list">
            {categories.map(({ sector, category, n }) => (
              <li key={`${sector.slug}-${category}`}>
                <Link href={categoryPath(sector.slug, category)} className="sr-row">
                  <span className="sr-icon" aria-hidden="true">
                    <Icon name={CATEGORY_ICON[category] ?? 'pin'} />
                  </span>
                  <span className="sr-text">
                    <b>{category}</b>
                    <small>{NO_COUNT.has(sector.slug) ? sector.title : `${n} adresse${n > 1 ? 's' : ''} · ${sector.title}`}</small>
                  </span>
                  <span />
                  <span className="sr-chev" aria-hidden="true">›</span>
                </Link>
              </li>
            ))}
          </ul>
          {main && top && top.places.length > 0 && (
            <PlacePanel places={top.places} more={{ href: `/annuaire/${main.slug}`, label: `Rechercher dans ${main.title}` }} />
          )}
        </section>
      )}

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
          <IconLabel label="Construire mon parcours" icon="pin" />
        </Link>
        <Link href="/proposer" className="sr-pill">
          <IconLabel label="Signaler une information à compléter" icon="clipboard" />
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
      </div>
    </article>
  )
}
