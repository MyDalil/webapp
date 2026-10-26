import Link from 'next/link'
import { CATEGORIES, categoryCounts, categoryLabel, searchProviders, type ProviderCard } from '@/modules/services'
import { WILAYAS } from '@/platform/referentiel/catalog'
import { communeName, communesOf } from '@/platform/referentiel/communes'
import { languageLabel, LANGUAGES } from '@/platform/referentiel/languages'

export type BrowseQuery = { categorie?: string; activite?: string; wilaya?: string; commune?: string; genre?: string; langue?: string }
const WILAYA_LIST = [...WILAYAS].filter((w) => !w.transition).sort((a, b) => a.name.localeCompare(b.name, 'fr'))
const stars = (r: number) => `★ ${r.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`

function Card({ p, activity }: { p: ProviderCard; activity?: string }) {
  const offers = [...p.offers].sort((a, b) => Number(b.activity === activity) - Number(a.activity === activity)).slice(0, 3)
  const href = `/prestataires/${p.slug}${activity ? `?activite=${activity}` : ''}`
  return (
    <li className="praticien-card provider-card">
      <div className="praticien-photo" style={p.photo ? { backgroundImage: `url(${p.photo})` } : undefined} aria-hidden="true">
        {!p.photo && p.name.charAt(0)}
      </div>
      <div className="praticien-body">
        <Link href={href}>
          <h2>{p.name}</h2>
        </Link>
        <p className="provider-rating">
          {p.rating ? (
            <>
              <b>{stars(p.rating)}</b> · {p.reviews} avis vérifié{p.reviews > 1 ? 's' : ''}
            </>
          ) : (
            'Nouveau sur DALIL'
          )}
          {p.missionsDone ? ` · ${p.missionsDone} mission${p.missionsDone > 1 ? 's' : ''}` : ''}
        </p>
        <ul className="provider-offers">
          {offers.map((o) => (
            <li key={o.activity}>
              <span>{o.label}</span>
              <b>{o.priceLabel}</b>
            </li>
          ))}
        </ul>
        <div className="praticien-tags">
          {p.demo && <span className="chip chip-example">Exemple</span>}
          {p.checks.identity && p.checks.legal && <span className="chip">Identité et statut vérifiés</span>}
          {p.checks.background && <span className="chip">Casier vérifié</span>}
          {p.clientele === 'women' && <span className="chip chip-plain">Réservé aux clientes</span>}
          {p.clientele === 'men' && <span className="chip chip-plain">Réservé aux clients</span>}
          {!!p.languages.length && <span className="chip chip-plain">{p.languages.map(languageLabel).join(' · ')}</span>}
        </div>
      </div>
      <div className="praticien-next">
        <small>{p.baseCommune ?? WILAYAS.find((w) => String(w.code) === p.wilaya)?.name}</small>
        <Link className="button primary" href={href}>
          Demander
        </Link>
      </div>
    </li>
  )
}

/** Recherche de prestataires : catégories, filtres (activité, wilaya, commune, genre, langue), résultats. */
export async function Browse({ q, fixedCategory }: { q: BrowseQuery; fixedCategory?: string }) {
  const cat = fixedCategory ?? q.categorie
  const [results, counts] = await Promise.all([searchProviders({ category: cat, activity: q.activite, wilaya: q.wilaya, commune: q.commune, gender: q.genre, language: q.langue }), categoryCounts()])
  const current = CATEGORIES.find((c) => c.value === cat)
  const communes = q.wilaya ? communesOf(q.wilaya) : []
  const action = fixedCategory ? `/services/${fixedCategory}` : '/services'
  return (
    <div className="praticiens services">
      <section className="praticiens-hero">
        <div className="container">
          <p className="eyebrow">{current ? 'Services' : 'Services à domicile'}</p>
          <h1>{current ? `${current.label}.` : 'Trouvez le bon prestataire, près de chez vous.'}</h1>
          <p className="auth-lead">Prestataires vérifiés par DALIL : identité, statut légal et, pour les enfants, les aînés et les cours, casier judiciaire. Réponse sous 24 h, échanges dans la messagerie DALIL, avis de vrais clients.</p>
          <form className="praticiens-search" action={action}>
            {!fixedCategory && (
              <label>
                <span>Service</span>
                <select name="categorie" defaultValue={q.categorie ?? ''}>
                  <option value="">Tous</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {current && (
              <label>
                <span>Activité</span>
                <select name="activite" defaultValue={q.activite ?? ''}>
                  <option value="">Toutes</option>
                  {current.activities.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
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
            {!!communes.length && (
              <label>
                <span>Commune</span>
                <select name="commune" defaultValue={q.commune ?? ''}>
                  <option value="">Toutes</option>
                  {communes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              <span>Prestataire</span>
              <select name="genre" defaultValue={q.genre ?? ''}>
                <option value="">Femme ou homme</option>
                <option value="femme">Une femme</option>
                <option value="homme">Un homme</option>
              </select>
            </label>
            <label>
              <span>Langue</span>
              <select name="langue" defaultValue={q.langue ?? ''}>
                <option value="">Toutes</option>
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
            <button className="button primary">Rechercher</button>
          </form>
        </div>
      </section>

      {!fixedCategory && !q.categorie && (
        <section className="section container">
          <ul className="service-tiles">
            {CATEGORIES.map((c) => (
              <li key={c.value}>
                <Link href={`/services/${c.value}`} className="service-tile">
                  <b>{c.label}</b>
                  <span>{c.activities.slice(0, 3).map(([, l]) => l).join(' · ')}</span>
                  <small>{counts[c.value] ? `${counts[c.value]} prestataire${counts[c.value] > 1 ? 's' : ''}` : 'Voir un exemple'}</small>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {current && (
        <section className="container">
          <div className="activity-chips">
            {current.activities.map(([v, l]) => (
              <Link key={v} className={`chip ${q.activite === v ? '' : 'chip-plain'}`} href={`/services/${current.value}?activite=${v}${q.wilaya ? `&wilaya=${q.wilaya}` : ''}`}>
                {l}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="section container">
        <p className="praticiens-count">
          {results.length} prestataire{results.length > 1 ? 's' : ''}
          {cat ? ` · ${categoryLabel(cat)}` : ''}
          {q.commune ? ` · ${communeName(q.commune)}` : q.wilaya ? ` · ${WILAYAS.find((w) => String(w.code) === q.wilaya)?.name}` : ''}
        </p>
        {results.length ? (
          <ul className="praticien-list">
            {results.map((p) => (
              <Card key={p.slug} p={p} activity={q.activite} />
            ))}
          </ul>
        ) : (
          <div className="praticiens-empty">
            <h2>Aucun prestataire pour cette recherche, pour l’instant.</h2>
            <p>Les prestataires rejoignent DALIL au fur et à mesure, après vérification. Élargissez la recherche ou revenez bientôt.</p>
            <Link className="button outline" href="/espace-pro?espace=services">
              Vous êtes prestataire ? Rejoindre DALIL
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}
