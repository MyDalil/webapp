import { isLang } from '@/platform/i18n'
import type { Metadata } from 'next'
import Link from '@/platform/ui/Link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import {
  CLIENTELE,
  GENDERS,
  categoryLabel,
  getProvider,
  isSensitive,
  providerReviews,
  toCard,
} from '@/modules/services'
import { RequestForm } from '@/modules/services/ui'
import { WILAYAS } from '@/platform/referentiel/catalog'
import { communeName, communesOf } from '@/platform/referentiel/communes'
import { languageLabel } from '@/platform/referentiel/languages'
import { PhotoGallery } from '@/platform/ui/PhotoGallery'
import { SaveButton } from '@/modules/membres/ui'
import { LeadFormSlot } from '@/modules/pros/ui'
import { ClaimLink, PlaceActions } from '@/modules/annuaire/ui'
import { JsonLd } from '@/platform/seo/JsonLd'
import { breadcrumbJsonLd, providerJsonLd } from '@/platform/seo/jsonLd'
import { absoluteAsset, absoluteUrl, asLang, factualDescription, ficheMetadata } from '@/platform/seo/metadata'

/**
 * ISR : la fiche ne lit ni la session ni l’adresse demandée (?activite est lu par le formulaire, côté navigateur).
 * Rafraîchie à chaque enregistrement du prestataire (hook de la collection) et au plus tard toutes les heures.
 */
export const revalidate = 3600
// Sans generateStaticParams, Next 16 recalcule la page à chaque visite malgré `revalidate`.
export const generateStaticParams = async () => []
type Props = { params: Promise<{ slug: string; lang: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, lang } = await params
  const p = await getProvider(slug, isLang(lang) ? lang : undefined)
  const wilaya = p ? WILAYAS.find((w) => String(w.code) === p.wilaya)?.name : null
  return p
    ? {
        ...ficheMetadata({
          lang: asLang(lang),
          path: `/prestataires/${p.slug ?? slug}`,
          title: `${p.displayName} — ${(p.categories ?? []).map(categoryLabel).join(', ')}`,
          description: factualDescription([
            `${(p.categories ?? []).map(categoryLabel).join(', ')}${wilaya ? `, wilaya de ${wilaya}` : ''}.`,
            'Identité et statut légal contrôlés avant publication. Demande en ligne : le prestataire accepte ou décline sous 24 h.',
          ]),
        }),
        robots: p.demo ? { index: false } : undefined,
      }
    : {}
}

const verifiedOn = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Algiers' }).format(new Date(iso))

const date = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Algiers',
  }).format(new Date(iso))

export default async function ProviderPage({ params }: Props) {
  const { slug, lang } = await params
  const p = await getProvider(slug, isLang(lang) ? lang : undefined)
  if (!p) notFound()
  const c = toCard(p)
  // En production, une fiche de démonstration est un exemple : visible, jamais contactable.
  const example = Boolean(p.demo) && process.env.VERCEL_ENV === 'production'
  const reviews = await providerReviews(p.id)
  const wilaya = WILAYAS.find((w) => String(w.code) === p.wilaya)?.name
  const zone = p.wholeWilaya
    ? communesOf(p.wilaya)
    : [...new Set([p.baseCommune, ...(p.communes ?? [])].filter(Boolean) as string[])].map(
        (id) => ({ id, name: communeName(id) ?? id }),
      )
  const zoneLabel = p.wholeWilaya
    ? `Toute la wilaya de ${wilaya}`
    : zone.map((z) => z.name).join(', ') || wilaya
  const cats = (p.categories ?? []).map(categoryLabel)
  const facts = [
    { label: 'Zone', value: zoneLabel },
    p.gender && { label: 'Prestataire', value: GENDERS.find((g) => g.value === p.gender)?.label },
    p.clientele &&
      p.clientele !== 'all' && {
        label: 'Clientèle',
        value: CLIENTELE.find((x) => x.value === p.clientele)?.label,
      },
    p.languages?.length && { label: 'Langues', value: p.languages.map(languageLabel).join(', ') },
    p.experienceYears && {
      label: 'Expérience',
      value: `${p.experienceYears} an${p.experienceYears > 1 ? 's' : ''}`,
    },
    c.missionsDone && {
      label: 'Missions',
      value: `${c.missionsDone} réalisée${c.missionsDone > 1 ? 's' : ''} via DALIL`,
    },
  ].filter((f): f is { label: string; value: string } => Boolean(f && f.value))
  const checks = [
    c.checks.identity
      ? `Identité vérifiée${p.verifiedAt ? ` le ${verifiedOn(p.verifiedAt)}` : ''}`
      : 'Identité en cours de vérification',
    c.checks.legal &&
      (p.legalForm === 'registre-commerce'
        ? 'Registre de commerce vérifié'
        : 'Auto-entrepreneur vérifié'),
    isSensitive((p.activities ?? []) as string[]) &&
      c.checks.background &&
      'Casier judiciaire vérifié',
  ].filter(Boolean) as string[]
  const L = asLang(lang)
  const url = absoluteUrl(L, `/prestataires/${p.slug ?? slug}`)
  // Fiche sans compte professionnel rattaché : le prestataire peut la revendiquer gratuitement.
  const claimable = !p.demo && !p.owner
  const jsonLd = [
    providerJsonLd({
      name: p.displayName,
      url,
      lang: L,
      description: p.bio,
      categories: cats,
      region: wilaya,
      areaServed: zone.map((z) => z.name),
      image: absoluteAsset(c.photo),
      languages: (p.languages ?? []).map(languageLabel),
      // Agrégat des seuls avis vérifiés publiés (missions réalisées via DALIL).
      rating: reviews.length && c.rating ? { value: c.rating, count: c.reviews } : null,
      offers: c.offers.map((o) => ({ name: o.label, price: o.price })),
    }),
    breadcrumbJsonLd([
      { name: 'Services', url: absoluteUrl(L, '/services') },
      ...(p.categories?.[0] ? [{ name: cats[0], url: absoluteUrl(L, `/services/${p.categories[0]}`) }] : []),
      { name: p.displayName, url },
    ]),
  ]
  return (
    <div className="pl">
      <JsonLd data={jsonLd} />
      <nav className="pl-crumbs" aria-label="Fil d’Ariane">
        <Link href="/services">Services</Link>
        {p.categories?.[0] && (
          <>
            {' '}
            › <Link href={`/services/${p.categories[0]}`}>{cats[0]}</Link>
          </>
        )}
      </nav>

      <div className="pl-grid">
        <div className="pl-main">
          <PhotoGallery
            photos={c.photo ? [{ url: c.photo, alt: p.displayName, credit: null, href: null }] : []}
            title={p.displayName}
          />
          {p.demo &&
            (example ? (
              <p className="praticien-notice">
                Fiche d’exemple : elle montre à quoi ressemble un prestataire DALIL. Les demandes
                sont désactivées. Elle disparaît dès qu’un vrai prestataire rejoint cette catégorie.
              </p>
            ) : (
              <p className="praticien-notice">
                Fiche de démonstration : envoyez une demande pour tester, aucune mission n’aura
                lieu.
              </p>
            ))}

          {p.bio && (
            <section className="pl-section">
              <h2>Présentation</h2>
              <p className="pl-text">{p.bio}</p>
            </section>
          )}

          <section className="pl-section">
            <h2>Prestations et tarifs</h2>
            <ul className="provider-offers is-large">
              {c.offers.map((o) => (
                <li key={o.activity}>
                  <span>{o.label}</span>
                  <b>{o.priceLabel}</b>
                </li>
              ))}
            </ul>
            <small className="muted-line">
              Prix indicatifs déclarés par le prestataire, confirmés ensemble avant la mission. À
              régler directement au prestataire{p.payment ? ` (${p.payment})` : ''} : DALIL
              n’encaisse rien.
            </small>
          </section>

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

          <section className="pl-section">
            <h2>Avis{reviews.length ? ` (${reviews.length})` : ''}</h2>
            {reviews.length ? (
              <ul className="review-list">
                {reviews.map((r) => (
                  <li key={r.id}>
                    <p className="review-head">
                      <b>
                        {'★'.repeat(r.rating)}
                        {'☆'.repeat(5 - r.rating)}
                      </b>{' '}
                      {r.author} · {r.activity} · {date(r.date)}
                    </p>
                    {r.comment && <p>{r.comment}</p>}
                    {!!r.photos.length && (
                      <div className="review-photos">
                        {r.photos.map((ph, i) => (
                          <a
                            key={i}
                            className="review-thumb"
                            href={ph.full ?? '#'}
                            target="_blank"
                            rel="noopener"
                            style={{ backgroundImage: `url(${ph.thumb ?? ph.full})` }}
                            aria-label="Voir la photo en grand"
                          />
                        ))}
                      </div>
                    )}
                    {r.reply && (
                      <p className="review-reply">
                        Réponse de {p.displayName} : {r.reply}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted-line">Pas encore d’avis.</p>
            )}
            <small className="muted-line">
              Avis vérifiés : seuls les clients d’une mission réalisée via DALIL peuvent en laisser
              un.
            </small>
          </section>

          <footer className="pl-sources">
            <span>Informations déclarées par le prestataire, contrôlées par DALIL.</span>
            <Link href="/feedback">Signaler une erreur</Link>
          </footer>
        </div>

        <aside className="pl-side">
          <div className="pl-card pl-id">
            <span className="pl-tag">
              {cats[0] ?? 'Services'} · {wilaya ?? 'Algérie'}
            </span>
            <h1>{p.displayName}</h1>
            <p className="pl-alt">
              {c.rating
                ? `★ ${c.rating.toLocaleString('fr-FR', { minimumFractionDigits: 1 })} · ${c.reviews} avis vérifié${c.reviews > 1 ? 's' : ''}`
                : 'Nouveau sur DALIL'}
            </p>
            <p className={`pl-status is-${c.checks.identity ? 'verified' : 'checking'}`}>
              {checks.join(' · ')}
            </p>
            <div className="pl-actions">
              <span />
              <SaveButton
                itemType="provider"
                itemKey={p.slug ?? ''}
                label={p.displayName}
                variant="button"
              />
              <PlaceActions name={p.displayName} target={p.demo ? null : { collection: 'providers', id: p.id }} />
              {!p.demo && <LeadFormSlot collection="providers" id={p.id} />}
            </div>
            {claimable && <ClaimLink label="Vous êtes ce prestataire ? Gérez cette fiche gratuitement" href="/espace-pro?espace=services" />}
          </div>
          <div className="pl-book">
            <Suspense>
              {example ? (
                <div className="pl-card">
                  <h2>Fiche d’exemple</h2>
                  <p className="muted-line">Les demandes sont désactivées sur cette fiche.</p>
                  <Link className="button primary" href="/espace-pro?espace=services">
                    Vous êtes prestataire ? Rejoindre DALIL
                  </Link>
                </div>
              ) : (
                <RequestForm
                  slug={p.slug ?? ''}
                  name={p.displayName}
                  offers={c.offers}
                  communes={zone}
                  clientele={(p.clientele ?? 'all') as 'all' | 'women' | 'men'}
                />
              )}
            </Suspense>
          </div>
        </aside>
      </div>
    </div>
  )
}
