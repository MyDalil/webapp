import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { CLIENTELE, GENDERS, categoryLabel, getProvider, isSensitive, providerReviews, toCard } from '@/modules/services'
import { RequestForm } from '@/modules/services/ui'
import { WILAYAS } from '@/platform/referentiel/catalog'
import { communeName, communesOf } from '@/platform/referentiel/communes'
import { languageLabel } from '@/platform/referentiel/languages'

export const dynamic = 'force-dynamic'
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ activite?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProvider((await params).slug)
  return p ? { title: `${p.displayName} — ${(p.categories ?? []).map(categoryLabel).join(', ')} · DALIL`, description: `Prestataire vérifié par DALIL. Demande en ligne, réponse sous 24 h.`, robots: p.demo ? { index: false } : undefined } : {}
}

const date = (iso: string) => new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'Africa/Algiers' }).format(new Date(iso))

export default async function ProviderPage({ params, searchParams }: Props) {
  const p = await getProvider((await params).slug)
  if (!p) notFound()
  const { activite } = await searchParams
  const c = toCard(p)
  // En production, une fiche de démonstration est un exemple : visible, jamais contactable.
  const example = Boolean(p.demo) && process.env.VERCEL_ENV === 'production'
  const reviews = await providerReviews(p.id)
  const wilaya = WILAYAS.find((w) => String(w.code) === p.wilaya)?.name
  const zone = p.wholeWilaya ? communesOf(p.wilaya) : [...new Set([p.baseCommune, ...(p.communes ?? [])].filter(Boolean) as string[])].map((id) => ({ id, name: communeName(id) ?? id }))
  const zoneLabel = p.wholeWilaya ? `Toute la wilaya de ${wilaya}` : zone.map((z) => z.name).join(', ') || wilaya
  return (
    <div className="praticien-page container">
      <Link className="back-link" href="/services">
        ← Tous les services
      </Link>
      <div className="praticien-layout">
        <div className="praticien-main">
          <header className="praticien-head">
            <div className="praticien-photo large" style={c.photo ? { backgroundImage: `url(${c.photo})` } : undefined} aria-hidden="true">
              {!c.photo && p.displayName.charAt(0)}
            </div>
            <div>
              <h1>{p.displayName}</h1>
              <p>{(p.categories ?? []).map(categoryLabel).join(' · ')}</p>
              <p className="provider-rating">
                {c.rating ? (
                  <>
                    <b>★ {c.rating.toLocaleString('fr-FR', { minimumFractionDigits: 1 })}</b> · {c.reviews} avis vérifié{c.reviews > 1 ? 's' : ''}
                  </>
                ) : (
                  'Nouveau sur DALIL'
                )}
                {c.missionsDone ? ` · ${c.missionsDone} mission${c.missionsDone > 1 ? 's' : ''} réalisée${c.missionsDone > 1 ? 's' : ''}` : ''}
              </p>
              <div className="praticien-tags">
                {c.checks.identity ? <span className="chip">Identité vérifiée</span> : <span className="chip chip-plain">Identité en cours de vérification</span>}
                {c.checks.legal && <span className="chip">{p.legalForm === 'registre-commerce' ? 'Registre de commerce vérifié' : 'Auto-entrepreneur vérifié'}</span>}
                {isSensitive((p.activities ?? []) as string[]) && c.checks.background && <span className="chip">Casier judiciaire vérifié</span>}
              </div>
            </div>
          </header>
          {p.demo && (example ? <p className="praticien-notice">Fiche d’exemple : elle montre à quoi ressemble un prestataire DALIL. Les demandes sont désactivées. Elle disparaît dès qu’un vrai prestataire rejoint cette catégorie.</p> : <p className="praticien-notice">Fiche de démonstration : envoyez une demande pour tester, aucune mission n’aura lieu.</p>)}
          {p.bio && (
            <section className="account-block">
              <h2>Présentation</h2>
              <p className="praticien-bio">{p.bio}</p>
              <small className="muted-line">Informations déclarées par le prestataire.</small>
            </section>
          )}
          <section className="account-block">
            <h2>Prestations et tarifs</h2>
            <ul className="provider-offers is-large">
              {c.offers.map((o) => (
                <li key={o.activity}>
                  <span>{o.label}</span>
                  <b>{o.priceLabel}</b>
                </li>
              ))}
            </ul>
            <small className="muted-line">Prix indicatifs déclarés par le prestataire, confirmés ensemble avant la mission. À régler directement au prestataire{p.payment ? ` (${p.payment})` : ''} : DALIL n’encaisse rien.</small>
          </section>
          <section className="account-block praticien-facts">
            <h2>Informations pratiques</h2>
            <dl>
              <dt>Zone</dt>
              <dd>{zoneLabel}</dd>
              {p.gender && (
                <>
                  <dt>Prestataire</dt>
                  <dd>{GENDERS.find((g) => g.value === p.gender)?.label}</dd>
                </>
              )}
              {p.clientele && p.clientele !== 'all' && (
                <>
                  <dt>Clientèle</dt>
                  <dd>{CLIENTELE.find((x) => x.value === p.clientele)?.label}</dd>
                </>
              )}
              {!!p.languages?.length && (
                <>
                  <dt>Langues</dt>
                  <dd>{p.languages.map(languageLabel).join(', ')}</dd>
                </>
              )}
              {!!p.experienceYears && (
                <>
                  <dt>Expérience</dt>
                  <dd>
                    {p.experienceYears} an{p.experienceYears > 1 ? 's' : ''}
                  </dd>
                </>
              )}
            </dl>
          </section>
          <section className="account-block">
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
                          <a key={i} className="review-thumb" href={ph.full ?? '#'} target="_blank" rel="noopener" style={{ backgroundImage: `url(${ph.thumb ?? ph.full})` }} aria-label="Voir la photo en grand" />
                        ))}
                      </div>
                    )}
                    {r.reply && <p className="review-reply">Réponse de {p.displayName} : {r.reply}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted-line">Pas encore d’avis.</p>
            )}
            <small className="muted-line">Avis vérifiés : seuls les clients d’une mission réalisée via DALIL peuvent en laisser un.</small>
          </section>
        </div>
        <aside className="praticien-aside">
          <Suspense>
            {example ? (
              <div className="account-block">
                <h2>Fiche d’exemple</h2>
                <p className="muted-line">Les demandes sont désactivées sur cette fiche.</p>
                <Link className="button primary" href="/espace-pro?espace=services">
                  Vous êtes prestataire ? Rejoindre DALIL
                </Link>
              </div>
            ) : (
              <RequestForm slug={p.slug ?? ''} name={p.displayName} offers={c.offers} communes={zone} clientele={(p.clientele ?? 'all') as 'all' | 'women' | 'men'} initialActivity={activite} />
            )}
          </Suspense>
        </aside>
      </div>
    </div>
  )
}
