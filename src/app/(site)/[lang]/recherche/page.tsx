import type { Metadata } from 'next'
import Link from '@/platform/ui/Link'
import { getPage } from '@/modules/contenus'
import { Tree } from '@/modules/contenus/ui'
import { searchEverything } from '@/modules/recherche'
import { cardsBySlugs } from '@/modules/annuaire'
import { PlaceRow } from '@/modules/annuaire/ui'
import { NearMe } from '@/modules/recherche/ui'
import { Icon } from '@/platform/ui/Icon'

const ICON: Record<string, string> = { adresse: 'pin', praticien: 'health', prestataire: 'briefcase', annonce: 'grid', guide: 'file', demarche: 'file', consulat: 'building', categorie: 'list', rubrique: 'grid' }
const distance = (d: number) => (d < 1 ? `${Math.max(50, Math.round(d * 20) * 50)} m` : `${d.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km`)

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

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; pos?: string; w?: string; p?: string }> }) {
  const { q = '', pos, w, p: pageParam } = await searchParams
  const query = q.trim().slice(0, 200)
  const position = positionOf(pos)
  const [page, r] = await Promise.all([getPage('/recherche'), query ? searchEverything(query, { position, prefer: /^\d{1,2}$/.test(w ?? '') ? w : null, page: Number(pageParam) || 1 }) : null])
  const pistes = r?.groups.find((g) => g.key === 'pistes')
  const adresses = r?.groups.find((g) => g.key === 'adresse')
  // Adresses : même carte que les pages de catégorie (vignette, catégorie · ville, statut, favori).
  const cards = new Map((await cardsBySlugs((adresses?.hits ?? []).map((h) => h.url.replace(/^\/adresses\//, '')))).map((c) => [`/adresses/${c.slug}`, c]))
  // Total exact des adresses correspondantes (jamais la taille de la liste affichée).
  const found = r?.addresses.total ?? 0
  const pageHref = (n: number) => `/recherche?${new URLSearchParams({ q: query, ...(pos ? { pos } : {}), ...(w ? { w } : {}), ...(n > 1 ? { p: String(n) } : {}) }).toString()}`
  // Recherche guidée (accompagnement) : seulement sans résultat, ou pour un projet professionnel (« je suis dentiste et je veux exercer »).
  const guided = !r || !r.total || r.professional
  return (
    <>
      {r && (
        <section className="sr" aria-label="Résultats">
          <header className="sr-head">
            <p className="sr-eyebrow">{r.unavailable ? 'Recherche momentanément indisponible' : r.total ? 'Résultats' : 'Aucun résultat précis'}</p>
            <h1>{query.slice(0, 80)}</h1>
            <p className="sr-meta">
              {r.place ? (r.nearby ? `Près ${/^[aeiouyhàâéèêîïôû]/i.test(r.place) ? 'd’' : 'de '}${r.place}` : `À ${r.place}`) : 'Toute l’Algérie'}
              {found ? ` · ${found.toLocaleString('fr-FR')} adresse${found > 1 ? 's' : ''}${r.addresses.shown < found ? `, ${r.addresses.shown} affichée${r.addresses.shown > 1 ? 's' : ''}${r.addresses.pages > 1 ? ` (page ${r.addresses.page} sur ${r.addresses.pages})` : ''}` : ''}` : ''}
            </p>
            {r.unavailable && <p className="sr-hint" role="alert">Une partie de la recherche n’a pas répondu. Ces résultats peuvent être incomplets : réessayez dans un instant.</p>}
            {!r.total && !r.unavailable && <p className="sr-hint">Aucune correspondance exacte. Vérifiez l’orthographe, essayez un mot plus court, ou parcourez les rubriques ci-dessous.</p>}
            <div className="sr-actions">
              <NearMe text={query} label={position ? 'Actualiser ma position' : 'Autour de moi'} className="sr-pill" />
              {r.intent.target !== 'recherche' && (
                <Link className="sr-pill is-primary" href={r.intent.url}>
                  Affiner : {r.intent.chips.join(' · ')}
                </Link>
              )}
            </div>
          </header>

          {r.spread && (
            <div className="sr-block">
              <p className="sr-note">Plusieurs lieux portent ce nom. Précisez la wilaya :</p>
              <nav className="sr-scroll" aria-label="Préciser la wilaya">
                {r.spread.map((s) => (
                  <Link key={s.wilaya} className="sr-chip" href={`/recherche?q=${encodeURIComponent(`${query} ${s.name}`)}`}>
                    {s.name} <small>{s.count}</small>
                  </Link>
                ))}
              </nav>
            </div>
          )}

          {pistes && (
            <nav className="sr-block sr-scroll" aria-label={pistes.title}>
              {pistes.hits.map((h) => (
                <Link key={`${h.type}:${h.id}`} href={h.url} className="sr-chip is-piste">
                  <b>{h.title}</b>
                  {h.subtitle && <small>{h.subtitle}</small>}
                </Link>
              ))}
            </nav>
          )}

          {r.groups
            .filter((g) => g.key !== 'pistes')
            .map((g) => {
              const first = g.hits.slice(0, 12)
              const more = g.hits.slice(12)
              const rows = (list: typeof g.hits) =>
                list.map((h) =>
                  cards.has(h.url) ? (
                    <li key={`${h.type}:${h.id}`} className="sr-place">
                      <PlaceRow p={cards.get(h.url)!} distance={h.distanceKm != null ? distance(h.distanceKm) : null} />
                    </li>
                  ) : (
                  <li key={`${h.type}:${h.id}`}>
                    <Link href={h.url} className="sr-row">
                      <span className={`sr-icon is-${h.type}`} aria-hidden="true">
                        <Icon name={ICON[h.type] ?? 'pin'} />
                      </span>
                      <span className="sr-text">
                        <b>{h.title}</b>
                        <small>
                          {h.subtitle}
                          {h.badge && !/^(À vérifier|En vérification)$/.test(h.badge) && <em className={h.badge === 'Exemple' || h.badge === 'Démo' ? 'is-example' : ''}> · {h.badge}</em>}
                        </small>
                      </span>
                      {h.distanceKm != null && <span className="sr-dist">{distance(h.distanceKm)}</span>}
                      <span className="sr-chev" aria-hidden="true">›</span>
                    </Link>
                  </li>
                  ),
                )
              return (
                <section key={g.key} className="sr-group">
                  <h2>
                    {g.title}
                    {r.nearby && g.key === 'adresse' && <small> · les plus proches d’abord</small>}
                  </h2>
                  <ul className="sr-list">{rows(first)}</ul>
                  {more.length > 0 && (
                    <details className="sr-more">
                      <summary>Afficher {more.length} de plus</summary>
                      <ul className="sr-list">{rows(more)}</ul>
                    </details>
                  )}
                  {g.key === 'adresse' && r.addresses.pages > 1 && (
                    <nav className="sr-actions" aria-label="Pages des adresses">
                      {r.addresses.page > 1 && <Link className="sr-pill" href={pageHref(r.addresses.page - 1)}>‹ Adresses précédentes</Link>}
                      {r.addresses.page < r.addresses.pages && <Link className="sr-pill is-primary" href={pageHref(r.addresses.page + 1)}>Adresses suivantes ›</Link>}
                    </nav>
                  )}
                </section>
              )
            })}
        </section>
      )}
      {guided && (
        <div className="legacy">
          {/* Avec une recherche, le titre principal est celui des résultats : l’en-tête de la page guidée est retiré (un seul h1). */}
          <Tree nodes={(r ? page?.content.slice(1) : page?.content) ?? []} overrides={{ GuidedSearch: { initialQuery: q.slice(0, 4000) } }} />
        </div>
      )}
    </>
  )
}
