import Link from 'next/link'
import type { Hub } from '../hubs'
import { PHOTOS } from '@/platform/referentiel/photos'
import { Icon } from '@/platform/ui/Icon'
import { SectionHead, TileCarousel, XpHero, type Tile } from '@/platform/ui/Xp'

/** Page de rubrique au format de l’accueil : diaporama des photos de la rubrique, rangées de grandes tuiles photo. */
export function HubView({ hub }: { hub: Hub }) {
  const photos = [hub.photo, ...hub.sections.flatMap((s) => s.cards.map((c) => c.photo))].filter((p): p is NonNullable<typeof p> => Boolean(p))
  const slides = [...new Set(photos)].slice(0, 4).map((k) => ({ src: PHOTOS[k].src, title: PHOTOS[k].alt, place: hub.eyebrow, href: hub.route, credit: PHOTOS[k].credit }))
  return (
    <div className="xp">
      <XpHero slides={slides} eyebrow={hub.eyebrow} title={<>{hub.title} <em className="hub-accent">{hub.accent}</em> ?</>} lead={hub.lead}>
        <form action="/recherche" className="dm-search" role="search">
          <Icon name="search" />
          <input name="q" type="search" placeholder={hub.search} aria-label="Rechercher" />
        </form>
      </XpHero>
      {hub.sections.map((s, i) => (
        <section key={s.title} className={`section${i % 2 ? ' section-tint' : ''}`}>
          <SectionHead eyebrow={hub.eyebrow} title={s.title} />
          <TileCarousel
            label={s.title}
            tiles={s.cards.map(
              (c): Tile => ({
                href: c.href,
                title: c.title,
                sub: c.sub,
                photo: c.photo ? PHOTOS[c.photo].src : null,
                icon: c.icon,
                footer: c.links ? (
                  <>
                    {c.links.map(([href, label]) => (
                      <Link key={href + label} href={href} className="sr-pill">
                        {label}
                      </Link>
                    ))}
                  </>
                ) : undefined,
              }),
            )}
          />
        </section>
      ))}
    </div>
  )
}
