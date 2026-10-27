import Link from 'next/link'
import type { ReactNode } from 'react'
import { Carousel } from './Carousel'
import { Icon } from './Icon'
import { Slideshow, type Slide } from './Slideshow'

/**
 * Briques « expérience » de l’accueil (validées par Rad) réutilisées sur toutes les rubriques :
 * héros plein écran (diaporama Ken Burns ou photo en parallaxe), carrousels de grandes tuiles photo, bande parallaxe.
 */
export function XpHero({ slides, photo, credit, eyebrow, title, lead, back, compact = false, children }: { slides?: Slide[]; photo?: string; credit?: string | null; eyebrow: string; title: ReactNode; lead?: string; back?: { href: string; label: string }; compact?: boolean; children?: ReactNode }) {
  return (
    <section className={`xp-hero${compact ? ' xp-hero-city' : ''}`}>
      {slides && slides.length > 1 ? (
        <Slideshow slides={slides} />
      ) : photo || slides?.[0]?.src ? (
        <div className="xp-hero-img" data-parallax="0.12" style={{ backgroundImage: `url(${photo ?? slides?.[0]?.src})` }} />
      ) : (
        <div className="xp-hero-img is-plain" />
      )}
      <div className="xp-hero-shade" />
      <div className="xp-hero-content container">
        {back && (
          <Link href={back.href} className="back-link inverse">
            ← {back.label}
          </Link>
        )}
        <p className="eyebrow inverse">{eyebrow}</p>
        <h1>{title}</h1>
        {lead && <p className="xp-lead">{lead}</p>}
        {children && <div className="xp-hero-actions">{children}</div>}
      </div>
      {(!slides || slides.length < 2) && (credit ?? slides?.[0]?.credit) && <small className="xp-credit">{credit ?? slides?.[0]?.credit}</small>}
    </section>
  )
}

export type Tile = { href: string; title: string; sub?: string; chip?: string; photo?: string | null; icon?: string; footer?: ReactNode }

/** Grande tuile photo (3:4), titre sur l’image ; sans photo juste : dégradé DALIL et pictogramme. */
export function PhotoTile({ t, i = 0 }: { t: Tile; i?: number }) {
  return (
    <div className="xp-tile-wrap" data-reveal style={{ ['--i' as string]: i % 6 }}>
      <Link href={t.href} className="city-tile top-tile xp-tile">
        <div className={`city-tile-img${t.photo ? '' : ' is-icon'}`} style={t.photo ? { backgroundImage: `url(${t.photo})` } : undefined}>
          {!t.photo && t.icon && (
            <span className="xp-tile-icon" aria-hidden="true">
              <Icon name={t.icon} />
            </span>
          )}
        </div>
        <div className="city-tile-body">
          {t.chip && <span className="chip">{t.chip}</span>}
          <h3>{t.title}</h3>
          {t.sub && <p>{t.sub}</p>}
        </div>
      </Link>
      {t.footer && <div className="xp-tile-footer">{t.footer}</div>}
    </div>
  )
}

/** Carrousel de tuiles ; peu de tuiles (≤ 4) : grille pleine largeur sur ordinateur, carrousel au doigt sur mobile. */
export function TileCarousel({ label, tiles, variant = 'tiles' }: { label: string; tiles: Tile[]; variant?: 'tiles' | 'cards' | 'wide' }) {
  const few = tiles.length <= 4
  return (
    <div className={few ? 'xp-few' : undefined} style={few ? { ['--n' as string]: tiles.length } : undefined}>
      <Carousel label={label} variant={variant}>
        {tiles.map((t, i) => (
          <PhotoTile key={t.href + t.title} t={t} i={i} />
        ))}
      </Carousel>
    </div>
  )
}

/** En-tête de section (même rythme que l’accueil). */
export function SectionHead({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="container">
      <div className="section-head" data-reveal>
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2>{title}</h2>
        </div>
        {action}
      </div>
    </div>
  )
}

/** Bande photo plein écran en parallaxe, texte à gauche. */
export function ParallaxBand({ photo, credit, eyebrow, title, text, children }: { photo: string; credit?: string | null; eyebrow?: string; title: string; text?: string; children?: ReactNode }) {
  return (
    <section className="xp-parallax" aria-label={title}>
      <div className="xp-parallax-img" data-parallax="0.18" style={{ backgroundImage: `url(${photo})` }} />
      <div className="xp-parallax-shade" />
      <div className="container xp-parallax-content" data-reveal>
        {eyebrow && <p className="eyebrow inverse">{eyebrow}</p>}
        <h2>{title}</h2>
        {text && <p>{text}</p>}
        {children}
      </div>
      {credit && <small className="xp-credit">{credit}</small>}
    </section>
  )
}
