import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { factsOf, formatDate, knownCityPhoto, nearbyCards, presentIntro } from '@/modules/annuaire'
import { languageLabel } from '@/platform/referentiel/languages'
import { SECTORS } from '@/platform/referentiel/catalog'
import { categoryPath } from '@/platform/referentiel/slug'
import { latinCity } from '@/platform/referentiel/communes'
import { PhotoGallery } from '@/platform/ui/PhotoGallery'
import { SaveButton } from '@/modules/membres/ui'
import { PlaceActions, PlaceMap } from '@/modules/annuaire/ui'
import { coverOf, galleryOf, getPlace, getPlaceSlugs, position, sectorTitle, wilayaName } from '@/modules/annuaire'

type Props = { params: Promise<{ slug: string }> }

/** Pages générées au build puis rafraîchies à chaque enregistrement dans /admin ; nouvelles fiches servies à la demande. */
export const revalidate = 300
export const dynamicParams = true
export const generateStaticParams = async () => (await getPlaceSlugs()).map((slug) => ({ slug }))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getPlace((await params).slug)
  // Fiche sans nom connu (« Mosquée · nom à compléter ») : utile sur place, pas dans les moteurs de recherche.
  const unnamed = p ? /nom à compléter/.test(p.name) : false
  return p ? { title: `${p.name} — ${p.category}, ${p.city}`, description: presentIntro(p.intro) ?? undefined, openGraph: { images: [coverOf(p)] }, ...(unnamed ? { robots: { index: false } } : {}) } : {}
}

const link = (url: string) => (/^https?:\/\//.test(url) ? url : `https://${url}`)
const social = (v: string, base: string) => (/^https?:\/\//.test(v) ? v : `${base}${v.replace(/^@/, '')}`)
const meters = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km`)

/**
 * Fiche lieu — modèle unique validé par Rad (maquette du 2026-10-26) : galerie à gauche, colonne d’actions à droite,
 * présentation professionnelle, faits connus en pastilles, contribution, à proximité ; provenance discrète en bas.
 */
export default async function PlacePage({ params }: Props) {
  const { slug } = await params
  const p = await getPlace(slug)
  if (!p) notFound()
  const status = p.verification ?? 'spotted'
  const updated = formatDate(p.verifiedAt ?? null)
  const { pos, exact } = position(p)
  const wilaya = wilayaName(p.wilaya)
  const sector = SECTORS.find((s) => s.slug === p.sector)
  const intro = presentIntro(p.intro)
  const facts = factsOf(p as never).filter((f) => f.label !== 'Catégorie')
  const nearby = await nearbyCards(p, 6)
  const photos = galleryOf(p)
  // Sans photo du lieu : photo de la ville si DALIL en a une (créditée comme illustration), sinon visuel neutre.
  const cityPic = knownCityPhoto(p.city)
  const gallery = photos.length ? photos : cityPic ? [{ url: cityPic, alt: p.city, credit: `Photo d’illustration : ${p.city}`, href: null }] : []
  const contacts = [
    p.phone && { label: p.phone, href: `tel:${p.phone.replace(/\s/g, '')}`, kind: 'Téléphone' },
    p.whatsapp && { label: p.whatsapp, href: `https://wa.me/${p.whatsapp.replace(/\D/g, '')}`, kind: 'WhatsApp' },
    p.email && { label: p.email, href: `mailto:${p.email}`, kind: 'Email' },
    p.website && { label: p.website.replace(/^https?:\/\//, '').replace(/\/$/, ''), href: link(p.website), kind: 'Site' },
    p.instagram && { label: 'Instagram', href: social(p.instagram, 'https://instagram.com/'), kind: 'Instagram' },
    p.facebook && { label: 'Facebook', href: social(p.facebook, 'https://facebook.com/'), kind: 'Facebook' },
  ].filter(Boolean) as { label: string; href: string; kind: string }[]
  const statusLine = status === 'verified' || status === 'labelled' ? `Vérifiée par DALIL${updated ? ` le ${updated}` : ''}` : status === 'checking' ? 'Vérification DALIL en cours' : 'À vérifier · visite DALIL à venir'
  const directions = pos ? `https://www.google.com/maps/dir/?api=1&destination=${pos[0]},${pos[1]}` : null

  return (
    <div className="pl">
      <nav className="pl-crumbs" aria-label="Fil d’Ariane">
        <Link href="/annuaire">Annuaire</Link> › <Link href={`/annuaire/${p.sector}`}>{sectorTitle(p.sector)}</Link>
        {sector?.categories.includes(p.category) && (
          <>
            {' '}
            › <Link href={categoryPath(p.sector, p.category)}>{p.category}</Link>
          </>
        )}
        {p.wilaya && sector?.categories.includes(p.category) && (
          <>
            {' '}
            › <Link href={categoryPath(p.sector, p.category, p.wilaya)}>{wilaya}</Link>
          </>
        )}
      </nav>

      <div className="pl-grid">
        <div className="pl-main">
          <PhotoGallery photos={gallery} title={p.name} />

          {intro && (
            <section className="pl-section">
              <h2>Présentation</h2>
              <p className="pl-text">{intro}</p>
            </section>
          )}

          {!!facts.length && (
            <section className="pl-section">
              <h2>En bref</h2>
              <ul className="pl-facts">
                {facts.map((f) => (
                  <li key={f.label}>
                    <span>{f.label}</span>
                    <b>{f.value}</b>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="pl-contribute">
            <div>
              <b>Vous connaissez ce lieu ?</b>
              <p>Horaires, accès, parking, services : aidez les prochains visiteurs.</p>
            </div>
            <Link className="button primary" href={`/proposer?fiche=${p.slug ?? slug}`}>
              Compléter une information
            </Link>
          </section>

          {!!nearby.length && (
            <section className="pl-section">
              <h2>À proximité</h2>
              <ul className="pl-near">
                {nearby.map((n) => (
                  <li key={n.slug}>
                    <Link href={`/adresses/${n.slug}`}>
                      <i style={{ backgroundImage: `url(${n.photo})` }} />
                      <b>{n.name}</b>
                      <small>
                        {n.category} · {meters(n.distanceM)}
                      </small>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <footer className="pl-sources">
            <span>{updated ? `Informations vérifiées le ${updated}` : 'Informations issues de sources publiques'}</span>
            {p.source?.provider === 'overture' && (
              <a href="https://overturemaps.org" target="_blank" rel="noreferrer">
                © Overture Maps Foundation
              </a>
            )}
            {p.source?.provider === 'osm' && (
              <a href={p.source.url ?? 'https://www.openstreetmap.org/copyright'} target="_blank" rel="noreferrer">
                © les contributeurs OpenStreetMap (ODbL)
              </a>
            )}
            {!!p.sources?.length && (
              <details>
                <summary>Sources</summary>
                <ul>
                  {p.sources.map((s) => (
                    <li key={s.id ?? s.url}>
                      <a href={link(s.url)} target="_blank" rel="noreferrer">
                        {s.label || s.url.replace(/^https?:\/\//, '')}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <Link href={`/proposer?fiche=${p.slug ?? slug}`}>Signaler une erreur</Link>
            <Link href={`/proposer?type=ferme&fiche=${p.slug ?? slug}`}>Lieu fermé ?</Link>
          </footer>
        </div>

        <aside className="pl-side">
          <div className="pl-card pl-id">
            <span className="pl-tag">
              {p.category} · {latinCity(p.city)}
            </span>
            <h1>{p.name}</h1>
            {(p.nameAr || p.nameEn) && <p className="pl-alt">{[p.nameEn, p.nameAr].filter(Boolean).join(' · ')}</p>}
            <p className={`pl-status is-${status}`}>{statusLine}</p>
            <div className="pl-actions">
              {directions ? (
                <a className="button primary" href={directions} target="_blank" rel="noreferrer">
                  Itinéraire
                </a>
              ) : (
                <span />
              )}
              <SaveButton itemType="listing" itemKey={p.slug ?? slug} label={p.name} variant="button" />
              <PlaceActions name={p.name} />
            </div>
          </div>

          <div className="pl-card">
            <h2>Infos pratiques</h2>
            <dl className="pl-info">
              <div>
                <dt>Adresse</dt>
                <dd>
                  {p.address || p.place || p.city}
                  {wilaya && <small>Wilaya de {wilaya}</small>}
                </dd>
              </div>
              {!!p.hours?.length && (
                <div>
                  <dt>Horaires</dt>
                  <dd>
                    {p.hours.map((h) => (
                      <span key={h.id ?? h.days}>
                        {h.days} · {h.time}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
              {!!p.languages?.length && (
                <div>
                  <dt>Langues</dt>
                  <dd>{p.languages.map(languageLabel).join(', ')}</dd>
                </div>
              )}
              {p.showContacts &&
                contacts.map((c) => (
                  <div key={c.href}>
                    <dt>{c.kind}</dt>
                    <dd>
                      <a href={c.href} target={c.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
                        {c.label}
                      </a>
                    </dd>
                  </div>
                ))}
            </dl>
            {pos && (
              <div className="pl-map">
                <PlaceMap places={[{ slug: p.slug ?? slug, name: p.name, category: p.category, city: p.city, pos, exact }]} />
                {!exact && <small>Position approximative : centre de {p.city}.</small>}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
