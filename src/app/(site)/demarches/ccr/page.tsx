import type { Metadata } from 'next'
import Link from 'next/link'
import { CCR, CCR_CHECKED, CCR_SOURCES, type GuideFact } from '@/modules/contenus'
import { packForGuide } from '@/modules/accompagnement'
import { Choice, Transparency, Why } from '@/modules/accompagnement/ui'

export const metadata: Metadata = {
  title: 'Certificat de changement de résidence (CCR) · DALIL',
  description: 'Conditions, véhicule, plafond, étapes et liens officiels du CCR pour rentrer vivre en Algérie. Sources datées.',
}
export const revalidate = 3600

const SRC = new Map(CCR_SOURCES.map((s, i) => [s.id, { ...s, n: i + 1 }]))
const dateFr = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

/** Renvois numérotés vers la liste des sources, en bas de page. */
function Refs({ ids }: { ids: string[] }) {
  return (
    <sup className="ac-refs">
      {ids.map((id) => {
        const s = SRC.get(id)
        return s ? (
          <a key={id} href={`#source-${s.n}`} title={`${s.publisher}${s.date ? ` · ${dateFr(s.date)}` : ''}`}>
            [{s.n}]
          </a>
        ) : null
      })}
    </sup>
  )
}

function Facts({ items, ordered = false }: { items: GuideFact[]; ordered?: boolean }) {
  const List = ordered ? 'ol' : 'ul'
  return (
    <List className={ordered ? 'ac-steps' : 'ac-facts'}>
      {items.map((f) => (
        <li key={f.text}>
          {f.text} <Refs ids={f.src} />
        </li>
      ))}
    </List>
  )
}

/** Démarche CCR : guide gratuit sourcé, et pack d’accompagnement quand l’offre est visible. */
export default async function CcrPage() {
  const pack = await packForGuide('/demarches/ccr')
  return (
    <article className="sr ac-page">
      <header className="sr-head">
        <nav className="ac-crumbs" aria-label="Fil d’Ariane">
          <Link href="/">Accueil</Link> › <Link href="/demarches">Démarches</Link> › <span>CCR</span>
        </nav>
        <h1>{CCR.title}</h1>
        <p className="sr-meta">{CCR.lead}</p>
        <p className="ac-badge">Dernière vérification : {dateFr(CCR_CHECKED)}</p>
      </header>

      {pack && (
        <>
          <Transparency />
          <Choice pack={pack} freeHref="#guide" />
        </>
      )}

      <section className="sr-group" id="guide" aria-label="Guide gratuit">
        <h2>Qui peut en bénéficier</h2>
        <Facts items={CCR.conditions} />
      </section>
      <section className="sr-group" aria-label="Le véhicule">
        <h2>Le véhicule</h2>
        <Facts items={[...CCR.vehicle, ...CCR.ceiling]} />
      </section>
      <section className="sr-group" aria-label="Étapes">
        <h2>Étape par étape</h2>
        <Facts items={CCR.steps} ordered />
      </section>

      <section className="sr-group" aria-label="Liens officiels">
        <h2>Liens officiels</h2>
        <ul className="sr-list">
          {CCR.official.map((o) => {
            const s = SRC.get(o.src)!
            return (
              <li key={o.src}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="sr-row is-wrap">
                  <span className="sr-icon" aria-hidden="true">✓</span>
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
        <p className="sr-note">Les règles et les tarifs peuvent varier d’un consulat à l’autre : vérifiez toujours auprès du vôtre.</p>
      </section>

      <section className="sr-group" aria-label="Questions fréquentes">
        <h2>Questions fréquentes</h2>
        <div className="ac-faq">
          {CCR.faq.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>
                {f.a} <Refs ids={f.src} />
              </p>
            </details>
          ))}
        </div>
      </section>

      {pack && <Why />}

      <section className="sr-group" aria-label="Sources">
        <h2>
          Sources <small>· relevées le {dateFr(CCR_CHECKED)}</small>
        </h2>
        <ol className="ac-sources">
          {CCR_SOURCES.map((s, i) => (
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
