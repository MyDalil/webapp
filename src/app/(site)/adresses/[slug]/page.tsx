import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LISTINGS, cityPhoto, formatDate } from '@/content/listings'
import { Icon } from '@/components/Icon'
import { SaveButton } from '@/components/SaveButton'
import { PlaceActions } from '@/components/PlaceActions'

type Props = { params: Promise<{ slug: string }> }

export const dynamicParams = false
export const generateStaticParams = () => LISTINGS.map((l) => ({ slug: l.slug }))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const l = LISTINGS.find((x) => x.slug === slug)
  return l ? { title: `${l.name} — ${l.category}, ${l.city}`, description: l.intro } : {}
}

export default async function PlacePage({ params }: Props) {
  const { slug } = await params
  const l = LISTINGS.find((x) => x.slug === slug)
  if (!l) notFound()
  const updated = formatDate(l.updated)
  return (
    <>
      <section className="place-hero container">
        <Link className="back-link" href={`/annuaire/${l.sector}`}>
          ← {l.sectorTitle}
        </Link>
        <div className="place-cover" style={{ backgroundImage: `url(${cityPhoto(l.city)})` }}>
          <div className="photo-caption">
            <span>{l.city}</span>
            <strong>{l.place || l.city}</strong>
          </div>
        </div>
        <div className="place-title-row">
          <div>
            <p className="eyebrow">
              {l.category} · {l.city}
            </p>
            <h1>{l.name}</h1>
            <p className="rating-line">
              À vérifier <span>{updated ? `Fiche mise à jour le ${updated}` : 'Fiche en cours de vérification'}</span>
            </p>
          </div>
          <div className="button-row">
            <SaveButton itemType="listing" itemKey={l.slug} label={l.name} variant="button" />
            <PlaceActions name={l.name} />
          </div>
        </div>
      </section>
      <section className="place-content container">
        <div className="place-main-column">
          <div className="section-head">
            <div>
              <p className="eyebrow">L’essentiel</p>
              <h2>Une adresse repérée, en cours de vérification.</h2>
              <p>{l.intro}</p>
            </div>
          </div>
          <div className="feature-grid">
            {l.criteria.map(([k, v]) => (
              <div key={k}>
                <span>{k}</span>
                <strong>{v}</strong>
              </div>
            ))}
          </div>
          <div className="reviews-card">
            <div>
              <p className="eyebrow">Source et mise à jour</p>
              <h2>D’où vient cette fiche.</h2>
              <p>{updated ? `Mise à jour le ${updated}. ` : ''}La publication ne vaut pas attribution du label Excellence.</p>
              <div className="button-row">
                {l.source && (
                  <a className="button outline" href={l.source} target="_blank" rel="noreferrer">
                    Consulter la source ↗
                  </a>
                )}
                <Link className="button text" href={`/proposer?fiche=${l.slug}`}>
                  Signaler une information à corriger <Icon name="arrow" />
                </Link>
              </div>
            </div>
          </div>
        </div>
        <aside className="trust-card">
          <p className="eyebrow">Qualité &amp; Confiance</p>
          <h3>Informations à confirmer</h3>
          <ul className="check-list">
            <li>
              <Icon name="check" />
              Adresse repérée
            </li>
            <li className="muted">○ Critères DALIL à vérifier</li>
            <li className="muted">○ Horaires et coordonnées à confirmer</li>
            <li className="muted">○ Label non attribué</li>
          </ul>
          <small>{updated ? `Dernière mise à jour : ${updated}` : 'Vérification en cours'}</small>
          <Link className="button primary wide" href="/onboarding">
            Voir les coordonnées
          </Link>
          <Link className="button text" href="/label">
            Voir nos critères <Icon name="arrow" />
          </Link>
        </aside>
      </section>
    </>
  )
}
