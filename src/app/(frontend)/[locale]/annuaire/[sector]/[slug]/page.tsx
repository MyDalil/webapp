import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server'
import { Award, BadgeCheck, Clock, Globe, Languages, Mail, MapPin, Navigation, Phone, Accessibility, Flag } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { getListing, pick, tx } from '@/lib/data'
import { MediaImage } from '@/components/Cards'
import { FallbackNotice, Rich, T } from '@/components/Localized'
import type { Locale } from '@/i18n/routing'
import type { Media, Sector, Specialty, Wilaya } from '@/payload-types'


// Rendu à la demande puis mis en cache ; purgé à chaque publication.
export const revalidate = 86400
export async function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ locale: Locale; sector: string; slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const l = await getListing(slug)
  if (!l) return {}
  return { title: tx(l.name as never, locale), description: tx(l.summary as never, locale) || undefined }
}

const ext = (u: string) => (u.startsWith('http') ? u : `https://${u}`)

export default async function ListingPage({ params }: Props) {
  const { locale, slug, sector: sectorSlug } = await params
  setRequestLocale(locale)
  const t = await getTranslations('directory')
  const c = await getTranslations('common')
  const fmt = await getFormatter()
  const l = await getListing(slug)
  if (!l) notFound()
  const sector = l.sector as Sector
  if (sector?.slug !== sectorSlug) notFound()
  const wilaya = (typeof l.wilaya === 'object' ? l.wilaya : null) as Wilaya | null
  const specs = ((l.specialties ?? []) as Specialty[]).filter((s) => typeof s === 'object')
  const fallback = pick(l.name as never, locale).fallback || pick(l.summary as never, locale).fallback
  const address = tx(l.address as never, locale)
  const place = [address, l.commune, wilaya ? tx(wilaya.name as never, locale) : null].filter(Boolean).join(', ')
  const mapsUrl = l.lat && l.lng ? `https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lng}` : place ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place + ', Algérie')}` : null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: tx(l.name as never, locale),
    description: tx(l.summary as never, locale) || undefined,
    telephone: l.phone || undefined,
    email: l.email || undefined,
    url: l.website ? ext(l.website) : undefined,
    address: place ? { '@type': 'PostalAddress', streetAddress: address || undefined, addressLocality: l.commune || undefined, addressRegion: wilaya ? tx(wilaya.name as never, 'fr') : undefined, addressCountry: 'DZ' } : undefined,
    geo: l.lat && l.lng ? { '@type': 'GeoCoordinates', latitude: l.lat, longitude: l.lng } : undefined,
  }

  const Row = ({ icon: I, label, children }: { icon: typeof Clock; label: string; children: React.ReactNode }) => (
    <div className="flex gap-3 py-4">
      <I className="mt-0.5 h-5 w-5 shrink-0 text-sea" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-sm font-semibold text-ink">{label}</dt>
        <dd className="mt-0.5 whitespace-pre-line break-words text-ink-2">{children}</dd>
      </div>
    </div>
  )

  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="wrap pt-8">
        <nav aria-label="Fil d’Ariane" className="text-sm text-muted">
          <Link href="/annuaire" className="hover:text-sea">
            {t('title')}
          </Link>
          <span className="mx-2">/</span>
          <Link href={`/annuaire/${sector.slug}`} className="hover:text-sea">
            {tx(sector.title as never, locale)}
          </Link>
        </nav>
      </div>
      <header className="wrap grid gap-8 py-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
        <div>
          <div className="flex flex-wrap gap-2">
            {l.label && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1 text-sm font-semibold text-paper">
                <Award className="h-4 w-4" aria-hidden="true" /> {t('label')}
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${l.verification === 'unverified' ? 'bg-sunk text-muted' : 'bg-casbah-soft text-casbah'}`}
            >
              <BadgeCheck className="h-4 w-4" aria-hidden="true" />
              {t(l.verification === 'claimed' ? 'claimed' : l.verification === 'verified' ? 'verified' : 'unverified')}
            </span>
          </div>
          <T v={l.name as never} locale={locale} as="h1" className="mt-4 block text-[2.4rem] leading-[1.05] md:text-[3.4rem]" />
          <T v={l.summary as never} locale={locale} as="p" className="mt-4 block max-w-2xl text-lg text-ink-2" />
          {specs.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2">
              {specs.map((s) => (
                <li key={s.id} className="rounded-full bg-sea-soft px-3 py-1 text-sm text-sea">
                  {tx(s.title as never, locale)}
                </li>
              ))}
            </ul>
          )}
        </div>
        {l.verifiedAt && <p className="text-sm text-muted lg:text-end">{t('verifiedOn', { date: fmt.dateTime(new Date(l.verifiedAt), { dateStyle: 'long' }) })}</p>}
      </header>

      {l.cover && (
        <div className="wrap">
          <div className="relative aspect-[16/7] overflow-hidden rounded-[1.5rem] border border-line">
            <MediaImage media={l.cover as Media} locale={locale} sizes="100vw" priority />
          </div>
        </div>
      )}

      <div className="wrap grid gap-12 py-12 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <FallbackNotice show={fallback}>{c('translationPending')}</FallbackNotice>
          <Rich v={l.description as never} locale={locale} />
          {!!(l.gallery as Media[] | undefined)?.length && (
            <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3">
              {(l.gallery as Media[]).map((m) => (
                <div key={m.id} className="relative aspect-square overflow-hidden rounded-xl">
                  <MediaImage media={m} locale={locale} sizes="33vw" />
                </div>
              ))}
            </div>
          )}
          {!!l.sources?.length && (
            <div className="mt-12 border-t border-line pt-6">
              <p className="kicker !text-muted">{t('sources')}</p>
              <ul className="mt-3 space-y-1 text-sm text-ink-2">
                {l.sources.map((s) => (
                  <li key={s.id}>{s.url ? <a href={ext(s.url)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-sea">{s.label}</a> : s.label}</li>
                ))}
              </ul>
            </div>
          )}
          {l.label && l.labelNote && <p className="mt-8 rounded-xl border border-line bg-surface p-5 text-ink-2">{l.labelNote}</p>}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-6">
            <p className="font-display text-xl">{t('contact')}</p>
            <dl className="mt-2 divide-y divide-line">
              <Row icon={MapPin} label={t('address')}>{place || t('unknown')}</Row>
              {l.phone && (
                <Row icon={Phone} label={t('phone')}>
                  <a href={`tel:${l.phone.replace(/\s/g, '')}`} dir="ltr" className="hover:text-sea">
                    {l.phone}
                  </a>
                </Row>
              )}
              {l.email && (
                <Row icon={Mail} label="Email">
                  <a href={`mailto:${l.email}`} className="hover:text-sea">
                    {l.email}
                  </a>
                </Row>
              )}
              {l.website && (
                <Row icon={Globe} label={t('website')}>
                  <a href={ext(l.website)} target="_blank" rel="noopener noreferrer" className="hover:text-sea" dir="ltr">
                    {l.website.replace(/^https?:\/\//, '')}
                  </a>
                </Row>
              )}
              <Row icon={Clock} label={t('hours')}>{tx(l.hours as never, locale) || t('unknown')}</Row>
              {tx(l.languages as never, locale) && <Row icon={Languages} label={t('languages')}>{tx(l.languages as never, locale)}</Row>}
              {tx(l.accessibility as never, locale) && <Row icon={Accessibility} label={t('accessibility')}>{tx(l.accessibility as never, locale)}</Row>}
            </dl>
            <div className="mt-4 grid gap-2">
              {mapsUrl && (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                  <Navigation className="h-4 w-4" aria-hidden="true" /> {t('directions')}
                </a>
              )}
              {l.whatsapp && (
                <a href={`https://wa.me/${l.whatsapp.replace(/[^\d]/g, '')}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                  WhatsApp
                </a>
              )}
            </div>
          </div>
          <Link href={{ pathname: '/feedback', query: { fiche: l.slug } }} className="mt-4 inline-flex items-center gap-2 text-sm text-muted hover:text-sea">
            <Flag className="h-4 w-4" aria-hidden="true" /> {t('report')}
          </Link>
        </aside>
      </div>
    </article>
  )
}
