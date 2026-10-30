import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { bookableModes, languageLabel, getPractitioner, isComplementary, specialtyLabel, toCard } from '@/modules/sante'
import { SlotPicker } from '@/modules/sante/ui'
import { WILAYAS } from '@/platform/referentiel/catalog'
import { PhotoGallery } from '@/platform/ui/PhotoGallery'
import { SaveButton } from '@/modules/membres/ui'
import { PlaceActions, PlaceMap } from '@/modules/annuaire/ui'
import { videoEnabled } from '@/platform/video'

export const revalidate = 3600
type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getPractitioner((await params).slug)
  return p ? { title: `${p.name} — prendre rendez-vous · DALIL`, description: `${(p.specialties ?? []).map(specialtyLabel).join(', ')} à ${p.city}. Réservation en ligne.` } : {}
}

/** Fiche praticien : modèle unique des fiches DALIL (galerie, colonne d’identité à droite), avec la prise de rendez-vous en plus. */
export default async function Practitioner({ params }: Props) {
  const p = await getPractitioner((await params).slug)
  if (!p) notFound()
  const c = toCard(p)
  const wilaya = p.wilaya ? WILAYAS.find((w) => String(w.code) === p.wilaya)?.name : null
  const complementary = (p.specialties ?? []).some(isComplementary)
  const specialties = (p.specialties ?? []).map(specialtyLabel)
  const first = p.specialties?.[0]
  const pos: [number, number] | null = typeof p.lat === 'number' && typeof p.lng === 'number' ? [p.lat, p.lng] : null
  const directions = pos ? `https://www.google.com/maps/dir/?api=1&destination=${pos[0]},${pos[1]}` : null
  const facts = [
    specialties.length && { label: specialties.length > 1 ? 'Spécialités' : 'Spécialité', value: specialties.join(', ') },
    c.modes.length && { label: 'Consultation', value: c.modes.map((m) => (m === 'visio' ? 'En visio' : 'Au cabinet')).join(' · ') },
    p.fee && { label: 'Tarif', value: p.fee },
    p.payment && { label: 'Paiement', value: p.payment },
    p.languages?.length && { label: 'Langues', value: p.languages.map(languageLabel).join(', ') },
  ].filter(Boolean) as { label: string; value: string }[]
  return (
    <div className="pl">
      <nav className="pl-crumbs" aria-label="Fil d’Ariane">
        <Link href="/praticiens">Praticiens</Link>
        {first && (
          <>
            {' '}
            › <Link href={`/praticiens?specialite=${first}`}>{specialtyLabel(first)}</Link>
          </>
        )}
        {first && p.wilaya && (
          <>
            {' '}
            › <Link href={`/praticiens?specialite=${first}&wilaya=${p.wilaya}`}>{wilaya}</Link>
          </>
        )}
      </nav>

      <div className="pl-grid">
        <div className="pl-main">
          <PhotoGallery photos={c.photo ? [{ url: c.photo, alt: p.name, credit: null, href: null }] : []} title={p.name} />
          {p.demo && <p className="praticien-notice">Fiche de démonstration : réservez librement pour tester, aucune consultation n’aura lieu.</p>}
          {complementary && <p className="praticien-notice">Pratique complémentaire : elle ne remplace pas un avis médical. DALIL vérifie l’identité et les diplômes déclarés, pas l’efficacité d’une méthode.</p>}

          {p.bio && (
            <section className="pl-section">
              <h2>Présentation</h2>
              <p className="pl-text">{p.bio}</p>
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

          {!!p.diplomas?.length && (
            <section className="pl-section">
              <h2>Diplômes</h2>
              <ul className="pl-facts">
                {p.diplomas.map((d, i) => (
                  <li key={i}>
                    <span>{d.verified ? 'Vérifié par DALIL' : 'Déclaré'}</span>
                    <b>
                      {d.title}
                      {d.institution ? ` — ${d.institution}` : ''}
                      {d.year ? ` (${d.year})` : ''}
                    </b>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <footer className="pl-sources">
            <span>Informations déclarées par le praticien{c.verified ? ', identité et diplôme vérifiés par DALIL' : ''}.</span>
            <span>Tarif à régler directement au praticien : DALIL n’encaisse rien.</span>
            <Link href="/feedback">Signaler une erreur</Link>
          </footer>
        </div>

        <aside className="pl-side">
          <div className="pl-card pl-id">
            <span className="pl-tag">
              {specialties[0] ?? 'Praticien'} · {p.city}
            </span>
            <h1>{p.name}</h1>
            {p.title && <p className="pl-alt">{p.title}</p>}
            <p className={`pl-status is-${c.verified ? 'verified' : 'checking'}`}>{c.verified ? 'Identité et diplôme vérifiés par DALIL' : 'Vérification DALIL en cours'}</p>
            <div className="pl-actions">
              {directions ? (
                <a className="button primary" href={directions} target="_blank" rel="noreferrer">
                  Itinéraire
                </a>
              ) : (
                <span />
              )}
              <SaveButton itemType="practitioner" itemKey={p.slug ?? ''} label={p.name} variant="button" />
              <PlaceActions name={p.name} />
            </div>
          </div>

          {c.modes.length ? (
            <Suspense>
              <SlotPicker slug={p.slug ?? ''} name={p.name} modes={bookableModes(p)} visioSoon={(p.modes ?? []).includes('visio') && !videoEnabled()} cancelNoticeHours={p.cancelNoticeHours ?? 24} />
            </Suspense>
          ) : (
            <div className="pl-card">
              <h2>Réservation en ligne bientôt disponible</h2>
              <p className="booking-note">{p.phone ? `En attendant, appelez le cabinet : ${p.phone}` : 'Revenez bientôt.'}</p>
            </div>
          )}

          <div className="pl-card">
            <h2>Infos pratiques</h2>
            <dl className="pl-info">
              <div>
                <dt>Cabinet</dt>
                <dd>
                  {p.cabinetName && <b>{p.cabinetName}</b>}
                  <span>{[...new Set([p.address, p.city].filter(Boolean))].join(', ')}</span>
                  {wilaya && <small>Wilaya de {wilaya}</small>}
                </dd>
              </div>
            </dl>
            {pos && (
              <div className="pl-map">
                <PlaceMap places={[{ slug: p.slug ?? '', name: p.name, category: specialties[0] ?? 'Praticien', city: p.city, pos, exact: true }]} />
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
