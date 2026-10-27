import type { Metadata } from 'next'
import Link from 'next/link'
import { getPage } from '@/modules/contenus'
import { Tree } from '@/modules/contenus/ui'
import { searchEverything } from '@/modules/recherche'
import { NearMe } from '@/modules/recherche/ui'

export const metadata: Metadata = { title: 'Que cherchez-vous en Algérie ?', robots: { index: false } }
export const dynamic = 'force-dynamic'

/**
 * Recherche complète : vrais résultats de l’index commun (rubriques, catégories et sous-catégories, adresses,
 * praticiens, prestataires, annonces, guides), puis la recherche guidée du prototype.
 */
/** `pos=lat,lng` (« Autour de moi ») : accepté seulement en Algérie, arrondi, jamais enregistré. */
function positionOf(v?: string) {
  const m = /^(-?\d{1,2}(?:\.\d{1,5})?),(-?\d{1,2}(?:\.\d{1,5})?)$/.exec(v ?? '')
  if (!m) return null
  const lat = Number(m[1])
  const lng = Number(m[2])
  return lat >= 18 && lat <= 38 && lng >= -9 && lng <= 12.5 ? { lat, lng } : null
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; pos?: string }> }) {
  const { q = '', pos } = await searchParams
  const query = q.trim().slice(0, 200)
  const position = positionOf(pos)
  const [page, r] = await Promise.all([getPage('/recherche'), query ? searchEverything(query, { position }) : null])
  return (
    <>
      {r && (
        <section className="section container search-results" aria-label="Résultats">
          <div className="section-head">
            <div>
              <p className="eyebrow">Résultats</p>
              <h1>
                {r.total ? `« ${query.slice(0, 80)} »` : `Rien de précis pour « ${query.slice(0, 80)} »`}
                {r.place && r.total ? <small className="search-place"> · {r.nearby ? `près ${/^[aeiouyhàâéèêîïôû]/i.test(r.place) ? 'd’' : 'de '}${r.place}` : `à ${r.place}`}</small> : null}
              </h1>
              {!r.total && <p>Vérifiez l’orthographe, essayez un mot plus court, ou parcourez les rubriques et les guides ci-dessous.</p>}
            </div>
            <NearMe text={query} label={position ? 'Actualiser ma position' : 'Autour de moi'} />
            {r.intent.target !== 'recherche' && (
              <Link className="button primary" href={r.intent.url}>
                Affiner : {r.intent.chips.join(' · ')}
              </Link>
            )}
          </div>

          {r.groups.map((g) =>
            g.key === 'pistes' ? (
              <nav key={g.key} className="search-pistes" aria-label={g.title}>
                {g.hits.map((h) => (
                  <Link key={`${h.type}:${h.id}`} href={h.url} className="search-piste">
                    <b>{h.title}</b>
                    <small>{h.subtitle}</small>
                  </Link>
                ))}
              </nav>
            ) : (
              <div key={g.key}>
                <h2 className="search-group">{g.title}</h2>
                <ul className="service-tiles">
                  {g.hits.map((h) => (
                    <li key={`${h.type}:${h.id}`}>
                      <Link href={h.url} className="service-tile">
                        <b>{h.title}</b>
                        {h.subtitle && <span>{h.subtitle}</span>}
                        {h.badge && <small className={`chip ${h.badge === 'Exemple' || h.badge === 'Démo' ? 'chip-example' : 'chip-plain'}`}>{h.badge}</small>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ),
          )}
        </section>
      )}
      <div className="legacy">
        <Tree nodes={page?.content ?? []} overrides={{ GuidedSearch: { initialQuery: q.slice(0, 4000) } }} />
      </div>
    </>
  )
}
