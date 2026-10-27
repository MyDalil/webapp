import Link from 'next/link'
import type { Pack } from '../offer'
import { NO_GUARANTEE, TRANSPARENCY, WHY } from '../texts'

/** Bloc de transparence : la démarche est gratuite sur les sites de l’État ; le pack paie l’aide humaine. */
export function Transparency() {
  return (
    <aside className="ac-transparency" aria-label="Transparence">
      <b>Transparence</b>
      <p>{TRANSPARENCY}</p>
    </aside>
  )
}

/** Deux options côte à côte : le guide gratuit, ou le pack d’accompagnement. */
export function Choice({ pack, freeHref, freeNote = 'Toutes les étapes, les pièces à préparer et les liens officiels.' }: { pack: Pack; freeHref: string; freeNote?: string }) {
  return (
    <section className="ac-choice" aria-label="Deux façons de faire votre démarche">
      <article className="ac-option">
        <p className="ac-kicker">Gratuit</p>
        <h3>Guide pas à pas</h3>
        <p>{freeNote}</p>
        <Link href={freeHref} className="sr-pill">
          Accéder au guide gratuit
        </Link>
      </article>
      <article className="ac-option is-premium">
        <p className="ac-kicker">Accompagnement</p>
        <h3>{pack.title}</h3>
        <p className="ac-price">
          <b>{pack.price.main}</b>
          {pack.price.sub && <small>{pack.price.sub}</small>}
        </p>
        <ul className="ac-includes">
          {pack.includes.map((i) => (
            <li key={i.item}>{i.item}</li>
          ))}
        </ul>
        <Link href={`/accompagnement/${pack.slug}`} className="sr-pill is-primary">
          Pack Accompagnement Premium
        </Link>
      </article>
    </section>
  )
}

/** « Pourquoi choisir nos accompagnements payants ? » */
export function Why() {
  return (
    <section className="sr-group" aria-label="Pourquoi choisir nos accompagnements payants ?">
      <h2>Pourquoi choisir nos accompagnements payants ?</h2>
      <ul className="sr-steps">
        {WHY.map((w) => (
          <li key={w.title}>
            <b>{w.title}</b>
            <small>{w.text}</small>
          </li>
        ))}
      </ul>
      <p className="sr-note">{NO_GUARANTEE}</p>
    </section>
  )
}
