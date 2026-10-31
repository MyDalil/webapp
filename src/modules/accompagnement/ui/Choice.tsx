import Link from '@/platform/ui/Link'
import type { Pack } from '../offer'
import { NO_GUARANTEE, TRANSPARENCY, WHY } from '../texts'

/** Bloc de transparence : la démarche est gratuite sur les sites de l’État ; le pack paie l’aide humaine. */
export function Transparency() {
  return (
    <aside className="ac-transparency" aria-label="Transparence">
      <b>Transparence DALIL</b>
      <p>{TRANSPARENCY}</p>
    </aside>
  )
}

/** Option 1 (guide autonome, gratuit) et option 2 (pack), côte à côte comme la maquette validée par Rad. */
/** `open` : l’offre est « Ouverte » dans /admin ; sinon le bouton payant affiche « À venir ». */
export function Choice({ pack, freeHref, outline, freeNote, open = false }: { pack: Pack; freeHref: string; outline?: string[]; freeNote?: string; open?: boolean }) {
  const book = pack.price.main.endsWith('€') || pack.price.main.endsWith('DA') ? `Je réserve mon pack — ${pack.price.main}` : 'Je réserve mon pack'
  return (
    <section className="ac-choice swipe" aria-label="Deux façons de faire votre démarche">
      <article className="ac-option">
        <header className="ac-option-head">
          <h3>Option 1 : Guide autonome</h3>
          <span className="ac-tag">Gratuit</span>
        </header>
        {outline?.length ? (
          <ol className="ac-outline">
            {outline.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ol>
        ) : (
          <p>{freeNote ?? 'Toutes les étapes, les pièces à préparer et les liens officiels.'}</p>
        )}
        <Link href={freeHref} className="sr-pill ac-cta">
          Accéder au guide gratuit
        </Link>
      </article>
      <article className="ac-option is-premium">
        <header className="ac-option-head">
          <h3>Option 2 : {pack.title}</h3>
          <span className="ac-tag is-premium">Accompagnement</span>
        </header>
        <p className="ac-option-lead">Un conseiller vous accompagne.</p>
        <ul className="ac-includes">
          {pack.includes.map((i) => (
            <li key={i.item}>{i.item}</li>
          ))}
        </ul>
        {open ? (
          <Link href={`/accompagnement/${pack.slug}`} className="sr-pill is-primary ac-cta" aria-label={`Pack Accompagnement Premium : ${book}`}>
            {book}
          </Link>
        ) : (
          <SoonButton />
        )}
        {open && (
          <small className="ac-pay-note">
            {pack.price.sub ? `${pack.price.sub} · ` : ''}
            Paiement en ligne : ouverture prochaine
          </small>
        )}
      </article>
    </section>
  )
}

/** « Pourquoi choisir nos accompagnements payants ? » */
export function Why() {
  return (
    <section className="sr-group" aria-label="Pourquoi choisir nos accompagnements payants ?">
      <h2>Pourquoi choisir nos accompagnements payants ?</h2>
      <ul className="sr-steps swipe">
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

/** Bouton d’une offre payante pas encore ouverte. */
export function SoonButton({ label = 'Accompagnement' }: { label?: string }) {
  return (
    <span className="sr-pill ac-cta is-soon" role="button" aria-disabled="true" aria-label={`Pack Accompagnement Premium : ${label} à venir`}>
      {label} · À venir
    </span>
  )
}
