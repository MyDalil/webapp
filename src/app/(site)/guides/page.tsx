import type { Metadata } from 'next'
import Link from 'next/link'
import { GUIDE_VISUALS } from '@/modules/contenus'
import { GUIDES } from '@/platform/referentiel/catalog'
import { PHOTOS } from '@/platform/referentiel/photos'
import { HubHero } from '@/platform/ui/HubHero'
import { Icon } from '@/platform/ui/Icon'
import { Visual } from '@/platform/ui/Visual'

export const metadata: Metadata = {
  title: 'Guides pratiques · DALIL',
  description: 'Sorties, bonnes adresses, vie quotidienne et projets en Algérie : un guide par sujet, étape par étape, avec ses sources.',
}

/** Index des guides (contenu du prototype) au format « application » : rubriques en cartes illustrées qui défilent. */
export default function Guides() {
  const categories = [...new Set(GUIDES.map((g) => g.category))]
  // Guides regroupés par rubrique ; l’ancre de la rubrique est posée sur son premier guide.
  const ordered = categories.flatMap((c) => GUIDES.filter((g) => g.category === c).map((g, i) => ({ ...g, anchor: i === 0 ? encodeURIComponent(c) : undefined })))
  return (
    <>
      <HubHero eyebrow="Guides" title={<>L’Algérie, <em className="hub-accent">sujet par sujet</em>.</>} lead="Sorties, bonnes adresses, vie quotidienne et projets : commencez par ce qui vous intéresse." photo={PHOTOS.djanet.src} credit={PHOTOS.djanet.credit}>
        <form action="/recherche" className="dm-search" role="search">
          <Icon name="search" />
          <input name="q" type="search" placeholder="Rechercher un guide…" aria-label="Rechercher un guide" />
        </form>
      </HubHero>
      <section className="sr" aria-label="Guides">
        <nav className="dm-chips-nav" aria-label="Rubriques">
          {categories.map((c) => (
            <a key={c} href={`#${encodeURIComponent(c)}`}>
              {c}
            </a>
          ))}
        </nav>
        <ul className="dm-cards dm-grid">
          {ordered.map((g) => {
            const v = GUIDE_VISUALS[g.slug] ?? { icon: 'file', tone: 'vert' as const }
            return (
              <li key={g.slug} className="dm-card" id={g.anchor}>
                <Link href={`/guides/${g.slug}`} className="dm-card-main">
                  <span className="dm-card-media">
                    <Visual photo={v.photo} icon={v.icon} tone={v.tone} />
                    <span className="dm-card-badge">{g.category}</span>
                    <span className="dm-card-overlay">
                      <b>{g.title}</b>
                      <small>{g.steps.length} étapes</small>
                    </span>
                  </span>
                  <span className="dm-card-text">
                    <small>{g.summary}</small>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
    </>
  )
}
