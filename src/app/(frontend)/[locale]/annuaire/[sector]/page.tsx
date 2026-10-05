import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Check, PlusCircle } from 'lucide-react'
import { Link, getPathname } from '@/i18n/navigation'
import { getListings, getSector, getSpecialties, getWilayas, tx } from '@/lib/data'
import { ListingCard, PageHero } from '@/components/Cards'
import type { Locale } from '@/i18n/routing'
import type { Guide } from '@/payload-types'

type Props = {
  params: Promise<{ locale: Locale; sector: string }>
  searchParams: Promise<{ specialite?: string; wilaya?: string; page?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, sector } = await params
  const s = await getSector(sector)
  if (!s) return {}
  return { title: tx(s.title as never, locale), description: tx(s.intro as never, locale) }
}

export default async function SectorPage({ params, searchParams }: Props) {
  const { locale, sector: slug } = await params
  const sp = await searchParams
  setRequestLocale(locale)
  const t = await getTranslations('directory')
  const g = await getTranslations('guides')
  const sector = await getSector(slug)
  if (!sector) notFound()
  const [specialties, wilayas] = await Promise.all([getSpecialties(sector.id), getWilayas()])
  const specialty = specialties.find((x) => x.slug === sp.specialite)
  const wilaya = wilayas.find((w) => w.slug === sp.wilaya)
  const page = Math.max(1, Number(sp.page) || 1)
  const res = await getListings({ sector: sector.id, specialty: specialty?.id, wilaya: wilaya?.id, page })
  const guide = typeof sector.guide === 'object' && sector.guide?._status === 'published' ? (sector.guide as Guide) : null
  const action = getPathname({ href: `/annuaire/${slug}`, locale })
  const featured = wilayas.filter((w) => w.featured)
  const others = wilayas.filter((w) => !w.featured)

  return (
    <>
      <PageHero kicker={t('title')} title={tx(sector.title as never, locale)} lead={tx(sector.intro as never, locale)} />
      <section className="wrap grid gap-10 py-12 lg:grid-cols-[18rem_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <form action={action} method="get" className="card grid gap-4 p-5">
            <div className="grid gap-1.5">
              <label htmlFor="specialite" className="text-sm font-semibold">
                {t('allSpecialties')}
              </label>
              <select id="specialite" name="specialite" defaultValue={specialty?.slug ?? ''} className="field">
                <option value="">{t('allSpecialties')}</option>
                {specialties.map((x) => (
                  <option key={x.id} value={x.slug ?? ''}>
                    {tx(x.title as never, locale)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="wilaya" className="text-sm font-semibold">
                {t('allWilayas')}
              </label>
              <select id="wilaya" name="wilaya" defaultValue={wilaya?.slug ?? ''} className="field">
                <option value="">{t('allWilayas')}</option>
                {featured.length > 0 && (
                  <optgroup label={t('priorityWilayas')}>
                    {featured.map((w) => (
                      <option key={w.id} value={w.slug ?? ''}>
                        {String(w.code).padStart(2, '0')} · {tx(w.name as never, locale)}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label={t('otherWilayas')}>
                  {others.map((w) => (
                    <option key={w.id} value={w.slug ?? ''}>
                      {String(w.code).padStart(2, '0')} · {tx(w.name as never, locale)}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary flex-1">
                {t('filter')}
              </button>
              {(specialty || wilaya) && (
                <Link href={`/annuaire/${slug}`} className="btn btn-ghost">
                  {t('reset')}
                </Link>
              )}
            </div>
          </form>
          {!!sector.criteria?.length && (
            <div className="mt-6 p-1">
              <p className="kicker !text-muted">{t('criteriaTitle')}</p>
              <ul className="mt-3 space-y-2 text-[0.95rem] text-ink-2">
                {sector.criteria.map((c) => (
                  <li key={c.id} className="flex gap-2">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-casbah" aria-hidden="true" />
                    {tx(c.label as never, locale)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        <div>
          <p className="mb-5 text-sm font-medium text-muted" aria-live="polite">
            {t('listings', { count: res.totalDocs })}
          </p>
          {res.docs.length ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {res.docs.map((l) => (
                  <ListingCard key={l.id} l={l} locale={locale} />
                ))}
              </div>
              {res.totalPages > 1 && (
                <nav className="mt-10 flex justify-center gap-2" aria-label="Pagination">
                  {Array.from({ length: res.totalPages }, (_, i) => i + 1).map((n) => (
                    <Link
                      key={n}
                      href={{ pathname: `/annuaire/${slug}`, query: { ...(specialty && { specialite: specialty.slug }), ...(wilaya && { wilaya: wilaya.slug }), page: n } }}
                      aria-current={n === page ? 'page' : undefined}
                      className={`grid h-11 min-w-11 place-items-center rounded-full px-3 text-sm font-semibold ${n === page ? 'bg-ink text-paper' : 'border border-line hover:bg-sunk'}`}
                    >
                      {n}
                    </Link>
                  ))}
                </nav>
              )}
            </>
          ) : (
            <div className="card zellige grid place-items-center px-6 py-16 text-center">
              <p className="font-display text-2xl text-ink">{t('emptyTitle')}</p>
              <p className="mt-3 max-w-md text-ink-2">{t('emptyText')}</p>
              <Link href="/proposer" className="btn btn-primary mt-7">
                <PlusCircle className="h-4 w-4" aria-hidden="true" /> {(await getTranslations('nav'))('propose')}
              </Link>
            </div>
          )}
          {guide && (
            <Link href={`/guides/${guide.slug}`} className="card mt-10 flex items-center justify-between gap-4 p-6">
              <span>
                <span className="kicker">{g('title')}</span>
                <span className="mt-1 block font-display text-xl">{tx(guide.title as never, locale)}</span>
              </span>
              <span className="text-sm font-semibold text-sea">{g('readGuide')} →</span>
            </Link>
          )}
        </div>
      </section>
    </>
  )
}
