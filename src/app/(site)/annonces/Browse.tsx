import Link from 'next/link'
import { CATEGORIES, DEALS, category, classifiedCounts, searchClassifieds, type ClassifiedCard, type SearchQuery } from '@/modules/annonces'
import { WILAYAS } from '@/platform/referentiel/catalog'

const WILAYA_LIST = [...WILAYAS].filter((w) => !w.transition).sort((a, b) => a.name.localeCompare(b.name, 'fr'))
const day = (iso: string) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'Africa/Algiers' }).format(new Date(iso))

export function ClassifiedTile({ c }: { c: ClassifiedCard }) {
  return (
    <li>
      <Link href={c.href} className="classified-card">
        <div className={`classified-card-img${c.photo ? '' : ' is-empty'}`} style={c.photo ? { backgroundImage: `url(${c.photo})` } : undefined}>
          {c.photos > 1 && <small>{c.photos} photos</small>}
        </div>
        <div className="classified-card-body">
          <span className={`chip ${c.example ? 'chip-example' : 'chip-plain'}`}>{c.example ? `Exemple · ${c.subLabel}` : c.subLabel}</span>
          <h3>{c.title}</h3>
          <b>{c.price}</b>
          <p>
            {c.place}
            {c.publishedAt ? ` · ${day(c.publishedAt)}` : ''}
            {c.authorKind === 'pro' ? ' · Pro' : ''}
          </p>
        </div>
      </Link>
    </li>
  )
}

/** Liste des annonces : catégories, filtres (type, wilaya, transaction, prix, mots), résultats. */
export async function Browse({ q, fixedCategory }: { q: SearchQuery; fixedCategory?: string }) {
  const cat = fixedCategory ?? q.categorie
  const current = category(cat)
  const [results, counts] = await Promise.all([searchClassifieds({ ...q, categorie: cat }), classifiedCounts()])
  const action = current ? `/annonces/${current.value}` : '/annonces'
  return (
    <div className="praticiens annonces">
      <section className="praticiens-hero">
        <div className="container">
          <p className="eyebrow">Annonces</p>
          <h1>{current ? `${current.label}.` : 'Achetez, vendez, louez, recrutez.'}</h1>
          <p className="auth-lead">{current ? current.lead : 'Immobilier, emploi, véhicules et objets, partout en Algérie. Chaque annonce est contrôlée par l’équipe DALIL avant publication. Les échanges passent par la messagerie DALIL.'}</p>
          <form className="praticiens-search" action={action}>
            <label>
              <span>Recherche</span>
              <input name="q" defaultValue={q.q ?? ''} placeholder="Mots-clés" maxLength={80} />
            </label>
            {current && (
              <label>
                <span>Type</span>
                <select name="type" defaultValue={q.type ?? ''}>
                  <option value="">Tous</option>
                  {current.subs.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {current?.value === 'immobilier' && (
              <label>
                <span>Transaction</span>
                <select name="transaction" defaultValue={q.transaction ?? ''}>
                  <option value="">Toutes</option>
                  {DEALS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              <span>Wilaya</span>
              <select name="wilaya" defaultValue={q.wilaya ?? ''}>
                <option value="">Toute l’Algérie</option>
                {WILAYA_LIST.map((w) => (
                  <option key={w.code} value={String(w.code)}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Prix max (DA)</span>
              <input name="max" type="number" inputMode="numeric" min={0} defaultValue={q.max ?? ''} />
            </label>
            <label>
              <span>Tri</span>
              <select name="tri" defaultValue={q.tri ?? ''}>
                <option value="">Plus récentes</option>
                <option value="prix">Prix croissant</option>
                <option value="prix-desc">Prix décroissant</option>
              </select>
            </label>
            <button className="button primary">Rechercher</button>
          </form>
        </div>
      </section>

      {!current && (
        <section className="section container">
          <ul className="service-tiles">
            {CATEGORIES.map((c) => (
              <li key={c.value}>
                <Link href={`/annonces/${c.value}`} className="service-tile">
                  <b>{c.label}</b>
                  <span>{c.subs.slice(0, 3).map(([, l]) => l).join(' · ')}</span>
                  <small>{counts.byCategory[c.value] ? `${counts.byCategory[c.value]} annonce${counts.byCategory[c.value] > 1 ? 's' : ''}` : 'Soyez le premier à publier'}</small>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {current && (
        <section className="container">
          <div className="activity-chips">
            {current.subs.map(([v, l]) => (
              <Link key={v} className={`chip ${q.type === v ? '' : 'chip-plain'}`} href={`/annonces/${current.value}?type=${v}${q.wilaya ? `&wilaya=${q.wilaya}` : ''}`}>
                {l}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="section container">
        <div className="classified-bar">
          <p className="praticiens-count">
            {results.length} annonce{results.length > 1 ? 's' : ''}
            {current ? ` · ${current.label}` : ''}
            {q.wilaya ? ` · ${WILAYAS.find((w) => String(w.code) === q.wilaya)?.name}` : ''}
          </p>
          <Link className="button primary" href={`/annonces/deposer${current ? `?categorie=${current.value}` : ''}`}>
            Déposer une annonce
          </Link>
        </div>
        {results.length ? (
          <ul className="classified-grid">
            {results.map((c) => (
              <ClassifiedTile key={c.id} c={c} />
            ))}
          </ul>
        ) : (
          <div className="praticiens-empty">
            <h2>Aucune annonce pour cette recherche, pour l’instant.</h2>
            <p>Élargissez la recherche, ou publiez la première annonce. Le dépôt est gratuit.</p>
            <Link className="button outline" href={`/annonces/deposer${current ? `?categorie=${current.value}` : ''}`}>
              Déposer une annonce
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}
