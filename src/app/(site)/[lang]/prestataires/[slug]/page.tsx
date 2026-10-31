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
import { PlaceActions } from '@/modules/annuaire/ui'

export const dynamic = 'force-dynamic'
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ activite?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProvider((await params).slug)
  return p
    ? {
        title: `${p.displayName} — ${(p.categories ?? []).map(categoryLabel).join(', ')} · DALIL`,
        description: `Prestataire vérifié par DALIL. Demande en ligne, réponse sous 24 h.`,
        robots: p.demo ? { index: false } : undefined,
      }
    : {}
}

const date = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Algiers',
  }).format(new Date(iso))

export default async function ProviderPage({ params, searchParams }: Props) {
  const p = await getProvider((await params).slug)
  if (!p) notFound()
  const { activite } = await searchParams
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
    c.checks.identity ? 'Identité vérifiée' : 'Identité en cours de vérification',
    c.checks.legal &&
      (p.legalForm === 'registre-commerce'
        ? 'Registre de commerce vérifié'
        : 'Auto-entrepreneur vérifié'),
    isSensitive((p.activities ?? []) as string[]) &&
      c.checks.background &&
      'Casier judiciaire vérifié',
  ].filter(Boolean) as string[]
  return (
    <div className="pl">
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
              <PlaceActions name={p.displayName} />
            </div>
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
                  initialActivity={activite}
                />
              )}
            </Suspense>
          </div>
        </aside>
      </div>
    </div>
  )
}
