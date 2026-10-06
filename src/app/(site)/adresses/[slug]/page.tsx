import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatDate } from '@/content/listings'
import { Icon } from '@/components/Icon'
import { SaveButton } from '@/components/SaveButton'
import { PlaceActions } from '@/components/PlaceActions'
import { PlaceMap } from '@/components/PlaceMap'
import { RESULT_LABEL, STATUS_LABEL, coverOf, galleryOf, getPlace, getPlaceSlugs, position, sectorTitle, wilayaName } from '@/lib/places'

type Props = { params: Promise<{ slug: string }> }

/** Pages générées au build puis rafraîchies à chaque enregistrement dans /admin ; nouvelles fiches servies à la demande. */
export const revalidate = 300
export const dynamicParams = true
export const generateStaticParams = async () => (await getPlaceSlugs()).map((slug) => ({ slug }))

const HEADLINE = {
  spotted: 'Une adresse repérée, en cours de vérification.',
  checking: 'Vérification DALIL en cours.',
  verified: 'Adresse vérifiée par DALIL.',
  labelled: 'Adresse labellisée Excellence.',
} as const

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getPlace((await params).slug)
  return p ? { title: `${p.name} — ${p.category}, ${p.city}`, description: p.intro ?? undefined, openGraph: { images: [coverOf(p)] } } : {}
}

const link = (url: string) => (/^https?:\/\//.test(url) ? url : `https://${url}`)
const social = (v: string, base: string) => (/^https?:\/\//.test(v) ? v : `${base}${v.replace(/^@/, '')}`)

export default async function PlacePage({ params }: Props) {
  const { slug } = await params
  const p = await getPlace(slug)
  if (!p) notFound()
  const status = p.verification ?? 'spotted'
  // Seule une vérification réelle date la fiche (pas un simple enregistrement dans /admin).
  const updated = formatDate(p.verifiedAt ?? null)
  const checked = status === 'verified' || status === 'labelled'
  const { pos, exact } = position(p)
  const gallery = galleryOf(p)
  const wilaya = wilayaName(p.wilaya)
  const contacts = [
    p.phone && { icon: 'file', label: p.phone, href: `tel:${p.phone.replace(/\s/g, '')}` },
    p.whatsapp && { icon: 'file', label: `WhatsApp · ${p.whatsapp}`, href: `https://wa.me/${p.whatsapp.replace(/\D/g, '')}` },
    p.email && { icon: 'file', label: p.email, href: `mailto:${p.email}` },
    p.website && { icon: 'arrow', label: p.website.replace(/^https?:\/\//, ''), href: link(p.website) },
    p.instagram && { icon: 'arrow', label: 'Instagram', href: social(p.instagram, 'https://instagram.com/') },
    p.facebook && { icon: 'arrow', label: 'Facebook', href: social(p.facebook, 'https://facebook.com/') },
  ].filter(Boolean) as { icon: string; label: string; href: string }[]

  return (
    <>
      <section className="place-hero container">
        <Link className="back-link" href={`/annuaire/${p.sector}`}>
          ← {sectorTitle(p.sector)}
        </Link>
        <div className="place-cover" style={{ backgroundImage: `url(${coverOf(p)})` }}>
          <div className="photo-caption">
            <span>{p.city}</span>
            <strong>{p.place || p.city}</strong>
          </div>
        </div>
        <div className="place-title-row">
          <div>
            <p className="eyebrow">
              {p.category} · {p.city}
            </p>
            <h1>{p.name}</h1>
            <p className="rating-line">
              {STATUS_LABEL[status]} <span>{updated ? `Vérifiée le ${updated}` : 'Fiche en cours de vérification'}</span>
            </p>
          </div>
          <div className="button-row">
            <SaveButton itemType="listing" itemKey={p.slug ?? slug} label={p.name} variant="button" />
            <PlaceActions name={p.name} />
          </div>
        </div>
      </section>
      <section className="place-content container">
        <div className="place-main-column">
          <div className="section-head">
            <div>
              <p className="eyebrow">L’essentiel</p>
              <h2>{HEADLINE[status]}</h2>
              {p.intro && <p>{p.intro}</p>}
            </div>
          </div>
          {gallery.length > 1 && (
            <div className="place-gallery">
              {gallery.slice(1, 7).map((g) => (
                <figure key={g.url}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.url} alt={g.alt} loading="lazy" />
                  {g.credit && <figcaption>{g.credit}</figcaption>}
                </figure>
              ))}
            </div>
          )}
          {!!p.criteria?.length && (
            <div className="feature-grid">
              {p.criteria.map((c) => (
                <div key={c.id ?? c.criterion} className={`result-${c.result}`}>
                  <span>{c.criterion}</span>
                  <strong>{RESULT_LABEL[c.result] ?? c.result}</strong>
                  {c.note && <small>{c.note}</small>}
                </div>
              ))}
            </div>
          )}
          <div className="reviews-card place-practical">
            <div>
              <p className="eyebrow">Infos pratiques</p>
              <h2>Pour s’y rendre.</h2>
              <ul className="practical-list">
                <li>
                  <span>Adresse</span>
                  <strong>{p.address || p.place || p.city}</strong>
                  {wilaya && <small>Wilaya de {wilaya}</small>}
                </li>
                <li>
                  <span>Horaires</span>
                  {p.hours?.length ? (
                    p.hours.map((h) => (
                      <strong key={h.id ?? h.days}>
                        {h.days} · {h.time}
                      </strong>
                    ))
                  ) : (
                    <strong>À confirmer</strong>
                  )}
                </li>
                {p.showContacts && contacts.length > 0 && (
                  <li>
                    <span>Contacts</span>
                    {contacts.map((c) => (
                      <a key={c.href} href={c.href} target={c.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
                        {c.label}
                      </a>
                    ))}
                  </li>
                )}
              </ul>
              {pos && (
                <div className="place-map">
                  <PlaceMap places={[{ slug: p.slug ?? slug, name: p.name, category: p.category, city: p.city, pos, exact }]} />
                  {!exact && <small>Position approximative : centre de {p.city}, en attendant la vérification sur place.</small>}
                </div>
              )}
              {pos && exact && (
                <div className="button-row">
                  <a className="button outline" href={`https://www.google.com/maps/dir/?api=1&destination=${pos[0]},${pos[1]}`} target="_blank" rel="noreferrer">
                    Itinéraire ↗
                  </a>
                </div>
              )}
            </div>
          </div>
          <div className="reviews-card">
            <div>
              <p className="eyebrow">Source et mise à jour</p>
              <h2>D’où vient cette fiche.</h2>
              <p>
                {updated ? `Dernière vérification le ${updated}. ` : ''}
                {status === 'labelled' ? 'Le label Excellence a été attribué après vérification des critères DALIL.' : 'La publication ne vaut pas attribution du label Excellence.'}
              </p>
              <div className="button-row">
                {p.sources?.map((s) => (
                  <a key={s.id ?? s.url} className="button outline" href={link(s.url)} target="_blank" rel="noreferrer">
                    {s.label || 'Consulter la source'} ↗
                  </a>
                ))}
                <Link className="button text" href={`/proposer?fiche=${p.slug ?? slug}`}>
                  Signaler une information à corriger <Icon name="arrow" />
                </Link>
              </div>
            </div>
          </div>
        </div>
        <aside className="trust-card">
          <p className="eyebrow">Qualité &amp; Confiance</p>
          <h3>{checked ? 'Informations vérifiées' : 'Informations à confirmer'}</h3>
          <ul className="check-list">
            <li>
              <Icon name="check" />
              Adresse repérée
            </li>
            {checked ? (
              <li>
                <Icon name="check" />
                Critères DALIL vérifiés
              </li>
            ) : (
              <li className="muted">○ {status === 'checking' ? 'Critères DALIL en cours de vérification' : 'Critères DALIL à vérifier'}</li>
            )}
            {checked && p.hours?.length ? (
              <li>
                <Icon name="check" />
                Horaires et coordonnées confirmés
              </li>
            ) : (
              <li className="muted">○ Horaires et coordonnées à confirmer</li>
            )}
            {status === 'labelled' ? (
              <li>
                <Icon name="check" />
                Label Excellence attribué
              </li>
            ) : (
              <li className="muted">○ Label non attribué</li>
            )}
          </ul>
          <small>{updated ? `Dernière vérification : ${updated}` : 'Vérification en cours'}</small>
          {!(p.showContacts && contacts.length) && (
            <Link className="button primary wide" href="/onboarding">
              Voir les coordonnées
            </Link>
          )}
          <Link className="button text" href="/label">
            Voir nos critères <Icon name="arrow" />
          </Link>
        </aside>
      </section>
    </>
  )
}
