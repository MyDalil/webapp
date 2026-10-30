import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { bookableModes, languageLabel, getPractitioner, isComplementary, specialtyLabel, toCard } from '@/modules/sante'
import { SlotPicker } from '@/modules/sante/ui'
import { WILAYAS } from '@/platform/referentiel/catalog'
import { videoEnabled } from '@/platform/video'

export const revalidate = 3600
type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getPractitioner((await params).slug)
  return p ? { title: `${p.name} — prendre rendez-vous · DALIL`, description: `${(p.specialties ?? []).map(specialtyLabel).join(', ')} à ${p.city}. Réservation en ligne.` } : {}
}

export default async function Practitioner({ params }: Props) {
  const p = await getPractitioner((await params).slug)
  if (!p) notFound()
  const c = toCard(p)
  const wilaya = p.wilaya ? WILAYAS.find((w) => String(w.code) === p.wilaya)?.name : null
  const complementary = (p.specialties ?? []).some(isComplementary)
  return (
    <div className="praticien-page container">
      <Link className="back-link" href="/praticiens">
        ← Tous les praticiens
      </Link>
      <div className="praticien-layout">
        <div className="praticien-main">
          <header className="praticien-head">
            <div className="praticien-photo large" style={c.photo ? { backgroundImage: `url(${c.photo})` } : undefined} aria-hidden="true">
              {!c.photo && p.name.replace(/^Dr\.?\s*/i, '').charAt(0)}
            </div>
            <div>
              <h1>{p.name}</h1>
              <p>{p.title ?? (p.specialties ?? []).map(specialtyLabel).join(' · ')}</p>
              <div className="praticien-tags">
                {c.verified ? <span className="chip">Identité et diplôme vérifiés par DALIL</span> : <span className="chip chip-plain">Vérification en cours</span>}
                {c.modes.includes('visio') && <span className="chip">Consultation en visio</span>}
              </div>
            </div>
          </header>
          {p.demo && <p className="praticien-notice">Fiche de démonstration : réservez librement pour tester, aucune consultation n’aura lieu.</p>}
          {complementary && <p className="praticien-notice">Pratique complémentaire : elle ne remplace pas un avis médical. DALIL vérifie l’identité et les diplômes déclarés, pas l’efficacité d’une méthode.</p>}
          {p.bio && (
            <section className="account-block">
              <h2>Présentation</h2>
              <p className="praticien-bio">{p.bio}</p>
              <small className="muted-line">Informations déclarées par le praticien.</small>
            </section>
          )}
          <section className="account-block praticien-facts">
            <h2>Informations pratiques</h2>
            <dl>
              {(p.cabinetName || p.address) && (
                <>
                  <dt>Cabinet</dt>
                  <dd>
                    {p.cabinetName && <b>{p.cabinetName}</b>}
                    {p.cabinetName && <br />}
                    {[...new Set([p.address, p.city, wilaya].filter(Boolean))].join(", ")}
                  </dd>
                </>
              )}
              {(p.fee || p.payment) && (
                <>
                  <dt>Tarif et paiement</dt>
                  <dd>
                    {[p.fee, p.payment].filter(Boolean).join(' · ')}
                    <br />
                    <small>À régler directement au praticien. DALIL n’encaisse rien.</small>
                  </dd>
                </>
              )}
              {!!p.languages?.length && (
                <>
                  <dt>Langues</dt>
                  <dd>{p.languages.map(languageLabel).join(', ')}</dd>
                </>
              )}
              {!!p.specialties?.length && (
                <>
                  <dt>Spécialités</dt>
                  <dd>{p.specialties.map(specialtyLabel).join(', ')}</dd>
                </>
              )}
              {!!p.diplomas?.length && (
                <>
                  <dt>Diplômes</dt>
                  <dd>
                    {p.diplomas.map((d, i) => (
                      <span key={i} className="diploma">
                        {d.title}
                        {d.institution ? ` — ${d.institution}` : ''}
                        {d.year ? ` (${d.year})` : ''} {d.verified ? <small className="ok">vérifié</small> : <small>déclaré</small>}
                        <br />
                      </span>
                    ))}
                  </dd>
                </>
              )}
            </dl>
          </section>
        </div>
        <aside className="praticien-aside">
          {c.modes.length ? (
            <Suspense>
              <SlotPicker slug={p.slug ?? ''} name={p.name} modes={bookableModes(p)} visioSoon={(p.modes ?? []).includes('visio') && !videoEnabled()} cancelNoticeHours={p.cancelNoticeHours ?? 24} />
            </Suspense>
          ) : (
            <div className="booking-card">
              <h3>Réservation en ligne bientôt disponible</h3>
              <p className="booking-note">{p.phone ? `En attendant, appelez le cabinet : ${p.phone}` : 'Revenez bientôt.'}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
