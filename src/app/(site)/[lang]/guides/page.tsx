import type { Metadata } from 'next'
import Link from '@/platform/ui/Link'
import { GUIDE_VISUALS } from '@/modules/contenus'
import { GUIDES } from '@/platform/referentiel/catalog'
import { PHOTOS, type PhotoKey } from '@/platform/referentiel/photos'
import { Icon } from '@/platform/ui/Icon'
import { SectionHead, TileCarousel, XpHero, type Tile } from '@/platform/ui/Xp'

export const metadata: Metadata = {
  title: 'Guides pratiques · DALIL',
  description: 'Sorties, bonnes adresses, vie quotidienne et projets en Algérie : un guide par sujet, étape par étape, avec ses sources.',
}

/** Index des guides au format de l’accueil : diaporama, puis une rangée de grandes tuiles photo par rubrique. */
export default function Guides() {
  // Rubriques du prototype regroupées en grands thèmes : chaque rangée compte plusieurs guides (pas de rangée à une tuile).
  const THEMES: [string, string[]][] = [
    ['S’installer et faire ses démarches', ['Installation', 'Territoires', 'Démarches', 'Travail']],
    ['La vie de tous les jours', ['Vie pratique', 'Santé & bien-être', 'Services']],
    ['Sortir et découvrir', ['Découverte', 'Sorties & découvertes', 'Manger & séjourner']],
    ['Vie musulmane', ['Vie musulmane']],
  ]
  const themed = new Set(THEMES.flatMap(([, c]) => c))
  const rest = [...new Set(GUIDES.map((g) => g.category))].filter((c) => !themed.has(c))
  const themes = rest.length ? [...THEMES, ['Autres guides', rest] as [string, string[]]] : THEMES
  const slides = (['hoggar', 'constantine-pont', 'cascade', 'alger-mer'] as PhotoKey[]).map((k) => ({ src: PHOTOS[k].src, title: PHOTOS[k].alt, place: 'Guides', href: '/guides', credit: PHOTOS[k].credit }))
  const tile = (g: (typeof GUIDES)[number]): Tile => {
    const v = GUIDE_VISUALS[g.slug]
    return { href: `/guides/${g.slug}`, title: g.title, sub: `${g.steps.length} étapes · ${g.summary}`, photo: v?.photo ? PHOTOS[v.photo].src : null, icon: v?.icon ?? 'file' }
  }
  return (
    <div className="xp">
      <XpHero slides={slides} eyebrow="Guides" title={<>L’Algérie, <em className="hub-accent">sujet par sujet</em>.</>} lead="Sorties, bonnes adresses, vie quotidienne et projets : commencez par ce qui vous intéresse.">
        <form action="/recherche" className="dm-search" role="search">
          <Icon name="search" />
          <input name="q" type="search" placeholder="Logement, école, Hajj…" aria-label="Rechercher un guide" />
        </form>
      </XpHero>
      <nav className="xp-chips xp-chips-top" aria-label="Thèmes">
        {themes.map(([t]) => (
          <Link key={t} href={`#${encodeURIComponent(t)}`} className="xp-chip is-text">
            {t}
          </Link>
        ))}
      </nav>
      {themes.map(([t, cats], i) => {
        const list = GUIDES.filter((g) => cats.includes(g.category))
        return (
          <section key={t} id={encodeURIComponent(t)} className={`section${i % 2 ? ' section-tint' : ''}`}>
            <SectionHead eyebrow={`${list.length} guide${list.length > 1 ? 's' : ''}`} title={t} />
            <TileCarousel label={t} tiles={list.map((g) => ({ ...tile(g), chip: g.category }))} />
          </section>
        )
      })}
    </div>
  )
}
