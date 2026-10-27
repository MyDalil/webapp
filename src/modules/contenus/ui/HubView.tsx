import Link from 'next/link'
import type { Hub } from '../hubs'
import { PHOTOS } from '@/platform/referentiel/photos'
import { HubHero } from '@/platform/ui/HubHero'
import { Icon } from '@/platform/ui/Icon'
import { Visual } from '@/platform/ui/Visual'

/** Page de rubrique : en-tête photo + recherche, puis cartes illustrées de même taille (défilement au doigt sur mobile). */
export function HubView({ hub }: { hub: Hub }) {
  const hero = PHOTOS[hub.photo]
  return (
    <>
      <HubHero eyebrow={hub.eyebrow} title={<>{hub.title} <em className="hub-accent">{hub.accent}</em> ?</>} lead={hub.lead} photo={hero.src} credit={hero.credit}>
        <form action="/recherche" className="dm-search" role="search">
          <Icon name="search" />
          <input name="q" type="search" placeholder={hub.search} aria-label="Rechercher" />
        </form>
      </HubHero>
      <section className="sr" aria-label={hub.eyebrow}>
        {hub.sections.map((s) => (
          <section key={s.title} className="sr-group" aria-label={s.title}>
            <h2>{s.title}</h2>
            <ul className="dm-cards swipe">
              {s.cards.map((c) => (
                <li key={c.title} className="dm-card">
                  <Link href={c.href} className="dm-card-main">
                    <span className="dm-card-media">
                      <Visual photo={c.photo} icon={c.icon} tone={c.tone} />
                      <span className="dm-card-overlay">
                        <b>{c.title}</b>
                      </span>
                    </span>
                    <span className="dm-card-text">
                      <small>{c.sub}</small>
                    </span>
                  </Link>
                  {c.links && (
                    <span className="dm-card-links">
                      {c.links.map(([href, label]) => (
                        <Link key={href + label} href={href}>
                          {label} <span aria-hidden="true">›</span>
                        </Link>
                      ))}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </section>
    </>
  )
}
