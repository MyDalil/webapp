import Link from '@/platform/ui/Link'
import type { Hub } from '../hubs'
import { PHOTOS } from '@/platform/referentiel/photos'
import { Icon, iconFor, iconTone } from '@/platform/ui/Icon'
import { SectionHead, TileCarousel, XpHero, type Tile } from '@/platform/ui/Xp'
import { MicButton } from '@/platform/ui/MicButton'

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
          <MicButton />
        </form>
      </XpHero>
      {hub.sections.map((s, i) => (
        <section key={s.title} className={`section${i % 2 ? ' section-tint' : ''}`}>
          <SectionHead eyebrow={hub.eyebrow} title={s.title} text={s.lead} />
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
                      <Link key={href + label} href={href} className="xp-sublink" style={{ ['--ic' as string]: iconTone(iconFor(label)) }}>
                        <span className="xp-sublink-ico" aria-hidden="true">
                          <Icon name={iconFor(label)} />
                        </span>
                        <span className="xp-sublink-txt">{label}</span>
                        <span className="sr-chev" aria-hidden="true">›</span>
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
