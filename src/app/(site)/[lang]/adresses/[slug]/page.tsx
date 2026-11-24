import { isLang } from '@/platform/i18n'
import { ACTION_LABELS } from '@/platform/seo/share'
import type { Metadata } from 'next'
import Link from '@/platform/ui/Link'
import { notFound } from 'next/navigation'
import { placeGate } from '@/platform/ui/SectionGate'
import { categoryPhoto, directionsUrl, factsOf, formatDate, knownCityPhoto, nearbyCards, presentIntro } from '@/modules/annuaire'
import { languageLabel } from '@/platform/referentiel/languages'
import { SECTORS } from '@/platform/referentiel/catalog'
import { categoryPath } from '@/platform/referentiel/slug'
import { latinCity } from '@/platform/referentiel/communes'
import { PhotoGallery } from '@/platform/ui/PhotoGallery'
import { lazyBg } from '@/platform/ui/lazyBg'
import { tilePhoto } from '@/platform/referentiel/photos'
import { SaveButton } from '@/modules/membres/ui'
import { LeadFormSlot } from '@/modules/pros/ui'
import { ClaimLink, PlaceActions, PlaceMap } from '@/modules/annuaire/ui'
import { JsonLd } from '@/platform/seo/JsonLd'
import { breadcrumbJsonLd, placeJsonLd } from '@/platform/seo/jsonLd'
import { absoluteAsset, absoluteUrl, asLang, factualDescription, ficheMetadata } from '@/platform/seo/metadata'
import { placeClaimLabel } from '@/platform/seo/claim'
import { thumbHashDataUrl } from '@/platform/storage/thumbhash'
import { galleryOf, getPlace, getPlaceSlugs, position, sectorTitle, wilayaName } from '@/modules/annuaire'

type Props = { params: Promise<{ slug: string; lang: string }> }

/** Pages générées au build puis rafraîchies à chaque enregistrement dans /admin ; nouvelles fiches servies à la demande. */
export const revalidate = 86400
export const dynamicParams = true
export const generateStaticParams = async () => (await getPlaceSlugs()).map((slug) => ({ slug }))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, lang } = await params
  const p = await getPlace(slug, isLang(lang) ? lang : undefined)
  // Fiche sans nom connu (« Mosquée · nom à compléter ») : utile sur place, pas dans les moteurs de recherche.
  const unnamed = p ? /nom à compléter/.test(p.name) : false
  if (!p) return {}
  const where = [latinCity(p.city), p.wilaya ? `wilaya de ${wilayaName(p.wilaya)}` : null].filter(Boolean).join(', ')
  return {
    ...ficheMetadata({
      lang: asLang(lang),
      path: `/adresses/${p.slug ?? slug}`,
      title: `${p.name} — ${p.category}, ${p.city}`,
      description: factualDescription([`${p.category} à ${where}.`, presentIntro(p.intro)]),
    }),
    ...(unnamed ? { robots: { index: false } } : {}),
  }
}

const link = (url: string) => (/^https?:\/\//.test(url) ? url : `https://${url}`)
const social = (v: string, base: string) => (/^https?:\/\//.test(v) ? v : `${base}${v.replace(/^@/, '')}`)
const meters = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km`)

/**
 * Fiche lieu — modèle unique validé par Rad (maquette du 2026-10-26) : galerie à gauche, colonne d’actions à droite,
 * présentation professionnelle, faits connus en pastilles, contribution, à proximité ; provenance discrète en bas.
 */
export default async function PlacePage({ params }: Props) {
  const { slug, lang } = await params
  const p = await getPlace(slug, isLang(lang) ? lang : undefined)
  if (!p) notFound()
  const off = await placeGate(`/adresses/${slug}`, lang, { sector: p.sector, category: p.category })
  if (off) return off
  const status = p.verification ?? 'spotted'
  const updated = formatDate(p.verifiedAt ?? null)
  const { pos, exact } = position(p)
  const wilaya = wilayaName(p.wilaya)
  const sector = SECTORS.find((s) => s.slug === p.sector)
  const intro = presentIntro(p.intro)
  const facts = factsOf(p as never).filter((f) => f.label !== 'Catégorie')
  const nearby = await nearbyCards(p, 6)
  // Fond provisoire de la couverture (aperçu flou ThumbHash) : visible le temps du chargement, recouvert par la photo.
  const photos = galleryOf(p).map((ph, k) => (k === 0 ? { ...ph, placeholder: thumbHashDataUrl(ph.thumbhash) } : ph))
  // Sans photo du lieu : photo d’illustration de la catégorie, sinon de la ville (créditées comme illustration), sinon visuel neutre.
  const catPic = categoryPhoto(p.category)
  const cityPic = knownCityPhoto(p.city)
  const gallery = photos.length
    ? photos
    : catPic
      ? [{ url: catPic.src, alt: p.category, credit: `Photo d’illustration : ${catPic.credit}`, href: null }]
      : cityPic
        ? [{ url: cityPic, alt: p.city, credit: `Photo d’illustration : ${p.city}`, href: null }]
        : []
  const contacts = [
    p.phone && { label: p.phone, href: `tel:${p.phone.replace(/\s/g, '')}`, kind: 'Téléphone' },
    p.whatsapp && { label: p.whatsapp, href: `https://wa.me/${p.whatsapp.replace(/\D/g, '')}`, kind: 'WhatsApp' },
    p.email && { label: p.email, href: `mailto:${p.email}`, kind: 'Email' },
    p.website && { label: p.website.replace(/^https?:\/\//, '').replace(/\/$/, ''), href: link(p.website), kind: 'Site' },
    p.instagram && { label: 'Instagram', href: social(p.instagram, 'https://instagram.com/'), kind: 'Instagram' },
    p.facebook && { label: 'Facebook', href: social(p.facebook, 'https://facebook.com/'), kind: 'Facebook' },
  ].filter(Boolean) as { label: string; href: string; kind: string }[]
  const statusLine = status === 'verified' || status === 'labelled' ? `Vérifiée par DALIL${updated ? ` le ${updated}` : ''}` : status === 'checking' ? 'Vérification DALIL en cours' : 'À vérifier · visite DALIL à venir'
  // Logo officiel (entreprises, organismes) : à côté du nom, jamais à la place d’une photo.
  const logo = p.logo && typeof p.logo === 'object' ? p.logo : null
  const logoUrl = logo?.sizes?.logo?.url ?? logo?.url ?? null
  const directions = pos ? directionsUrl(pos) : null
  const claim = placeClaimLabel(p.sector, p.category)
  const L = asLang(lang)
  const url = absoluteUrl(L, `/adresses/${p.slug ?? slug}`)
  const inCategory = sector?.categories.includes(p.category)
  const jsonLd = [
    placeJsonLd({
      name: p.name,
      url,
      lang: L,
      category: p.category,
      description: intro,
      alternateNames: [p.nameEn, p.nameAr],
      address: { street: p.address || p.place, locality: latinCity(p.city), region: wilaya },
      pos: exact ? pos : null,
      phone: p.showContacts ? p.phone : null,
      website: p.showContacts ? p.website : null,
      images: photos.map((ph) => absoluteAsset(ph.url)),
      hours: (p.hours ?? []).map((h) => `${h.days} ${h.time}`),
    }),
    breadcrumbJsonLd([
      { name: 'Annuaire', url: absoluteUrl(L, '/annuaire') },
      { name: sectorTitle(p.sector), url: absoluteUrl(L, `/annuaire/${p.sector}`) },
      ...(inCategory ? [{ name: p.category, url: absoluteUrl(L, categoryPath(p.sector, p.category)) }] : []),
      ...(inCategory && p.wilaya && wilaya ? [{ name: wilaya, url: absoluteUrl(L, categoryPath(p.sector, p.category, p.wilaya)) }] : []),
      { name: p.name, url },
    ]),
  ]

  return (
    <div className="pl">
      <JsonLd data={jsonLd} />
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
                      <i {...lazyBg(tilePhoto(n.photo))} />
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
            <div className="pl-head">
              {logoUrl && <img className="pl-logo" src={logoUrl} alt="" width={56} height={56} />}
              <h1>{p.name}</h1>
            </div>
            {(p.nameAr || p.nameEn) && <p className="pl-alt">{[p.nameEn, p.nameAr].filter(Boolean).join(' · ')}</p>}
            {(status === 'verified' || status === 'labelled') && <p className={`pl-status is-${status}`}>{statusLine}</p>}
            <div className="pl-actions">
              {directions ? (
                <a className="button primary" href={directions} target="_blank" rel="noreferrer">
                  {ACTION_LABELS.directions[L]}
                </a>
              ) : (
                <span />
              )}
              <SaveButton itemType="listing" itemKey={p.slug ?? slug} label={p.name} variant="button" />
              <PlaceActions name={p.name} phone={p.showContacts ? p.phone : null} whatsapp={p.showContacts ? p.whatsapp : null} target={{ collection: 'places', id: p.id }} />
              <LeadFormSlot collection="places" id={p.id} category={p.category} />
            </div>
            {claim && <ClaimLink label={claim} href={`/revendiquer/places/${slug}`} />}
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
