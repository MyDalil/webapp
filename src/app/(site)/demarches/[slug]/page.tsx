import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { DEMARCHES, demarcheBySlug, type Demarche, type GuideFact } from '@/modules/contenus'
import { offerState, packForGuide } from '@/modules/accompagnement'
import { Choice, SoonButton, Transparency, Why } from '@/modules/accompagnement/ui'
import { Icon } from '@/platform/ui/Icon'

type Props = { params: Promise<{ slug: string }> }
export const revalidate = 3600
export const dynamicParams = false
export const generateStaticParams = () => DEMARCHES.map((d) => ({ slug: d.slug }))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = demarcheBySlug((await params).slug)
  return d ? { title: `${d.title} · DALIL`, description: `${d.lead} Étapes, pièces, liens officiels et sources datées.` } : {}
}

/** Couleurs des pictogrammes des points clés (même palette que les catégories). */
const KEY_TONES = ['ciel', 'sable', 'violet', 'vert']
const dateFr = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

/** Renvois numérotés vers la liste des sources, en bas de page. */
function Refs({ d, ids }: { d: Demarche; ids: string[] }) {
  return (
    <sup className="ac-refs">
      {ids.map((id) => {
        const n = d.sources.findIndex((s) => s.id === id) + 1
        const s = d.sources[n - 1]
        return n ? (
          <a key={id} href={`#source-${n}`} title={`${s.publisher}${s.date ? ` · ${dateFr(s.date)}` : ''}`}>
            [{n}]
          </a>
        ) : null
      })}
    </sup>
  )
}

function Facts({ d, items, ordered = false }: { d: Demarche; items: GuideFact[]; ordered?: boolean }) {
  const List = ordered ? 'ol' : 'ul'
  return (
    <List className={ordered ? 'ac-steps' : 'ac-facts'}>
      {items.map((f) => (
        <li key={f.text}>
          {f.text} <Refs d={d} ids={f.src} />
        </li>
      ))}
    </List>
  )
}

/** Fiche d’une démarche (maquette validée par Rad) : visuel, points clés, deux options, guide gratuit sourcé. */
export default async function DemarchePage({ params }: Props) {
  const d = demarcheBySlug((await params).slug)
  if (!d) notFound()
  const pack = await packForGuide(`/demarches/${d.slug}`)
  const open = (await offerState()).mode === 'ouvert'
  return (
    <article className="sr dm-page">
      <nav className="ac-crumbs dm-crumbs" aria-label="Fil d’Ariane">
        <Link href="/">Accueil</Link> › <Link href="/demarches">Démarches</Link> › <span>{d.short}</span>
      </nav>

      <header className="dm-hero">
        <div className="dm-hero-media">
          {/* eslint-disable-next-line @next/next/no-img-element -- illustration SVG locale */}
          <img className="dm-hero-img" src={d.image} alt="" width={640} height={360} />
          <Link href="/demarches" className="dm-round" aria-label="Retour aux démarches">
            ‹
          </Link>
          {d.credit && <small className="dm-credit">{d.credit}</small>}
        </div>
        <div className="dm-hero-text">
          <h1>{d.title}</h1>
          <p className="dm-where">
            <Icon name="pin" /> {d.where}
          </p>
          <p className="sr-meta">{d.lead}</p>
          <p className="ac-badge">Dernière vérification : {dateFr(d.checked)}</p>
        </div>
      </header>

      <section className="sr-group" aria-label="Points clés">
        <h2>Points clés</h2>
        <ul className="dm-keys swipe">
          {d.keyPoints.map((k, i) => (
            <li key={k.label}>
              <span className={`dm-key-icon is-${KEY_TONES[i % KEY_TONES.length]}`}>
                <Icon name={k.icon} />
              </span>
              <small>{k.label}</small>
              <b>
                {k.value} <Refs d={d} ids={k.src} />
              </b>
            </li>
          ))}
        </ul>
      </section>

      {pack && (
        <div className="dm-pricebar">
          <p className={pack.priceEur || pack.priceDa ? undefined : 'is-tbd'}>
            <b>{pack.price.main}</b>
            <small>{pack.perPerson ? 'par personne' : 'par dossier'} · accompagnement</small>
          </p>
          {open ? (
            <Link href={`/accompagnement/${pack.slug}`} className="sr-pill is-primary" aria-label="Pack Accompagnement Premium : réserver">
              Réserver
            </Link>
          ) : (
            <SoonButton label="Réserver" />
          )}
        </div>
      )}

      {pack && (
        <>
          <Transparency />
          <Choice pack={pack} freeHref="#guide" outline={d.outline} open={open} />
        </>
      )}

      <div id="guide" className="dm-guide">
        {d.sections.map((s) => (
          <section key={s.title} className="sr-group" aria-label={s.title}>
            <h2>{s.title}</h2>
            <Facts d={d} items={s.facts} />
          </section>
        ))}
        <section className="sr-group" aria-label="Étape par étape">
          <h2>Étape par étape</h2>
          <Facts d={d} items={d.steps} ordered />
        </section>
      </div>

      <section className="sr-group" aria-label="Liens officiels">
        <h2>Liens officiels</h2>
        <ul className="sr-list">
          {d.official.map((o) => {
            const s = d.sources.find((x) => x.id === o.src)!
            return (
              <li key={o.src}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="sr-row is-wrap">
                  <span className="sr-icon" aria-hidden="true">
                    <Icon name="check" />
                  </span>
                  <span className="sr-text">
                    <b>{o.label}</b>
                    <small className="sr-site">{new URL(s.url).hostname} ↗</small>
                  </span>
                  <span />
                  <span className="sr-chev" aria-hidden="true">›</span>
                </a>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="sr-group" aria-label="Questions fréquentes">
        <h2>Questions fréquentes</h2>
        <div className="ac-faq">
          {d.faq.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>
                {f.a} <Refs d={d} ids={f.src} />
              </p>
            </details>
          ))}
        </div>
      </section>

      {pack && <Why />}

      <section className="sr-group" aria-label="Sources">
        <h2>
          Sources <small>· relevées le {dateFr(d.checked)}</small>
        </h2>
        <ol className="ac-sources">
          {d.sources.map((s, i) => (
            <li key={s.id} id={`source-${i + 1}`}>
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                {s.title}
              </a>{' '}
              — {s.publisher}
              {s.date ? `, ${dateFr(s.date)}` : ''} · {s.official ? 'source officielle' : 'presse, à recouper avec le Journal officiel'}
            </li>
          ))}
        </ol>
        <p className="sr-note">
          Une information a changé ? <Link href="/feedback">Dites-le-nous</Link>.
        </p>
      </section>
    </article>
  )
}
