import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { search } from '@/lib/data'
import { ArticleCard, GuideCard, ListingCard } from '@/components/Cards'
import { SearchBox } from '@/components/SearchBox'
import type { Locale } from '@/i18n/routing'

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<{ q?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'search' })
  return { title: t('title'), robots: { index: false } }
}

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { q = '' } = await searchParams
  setRequestLocale(locale)
  const t = await getTranslations('search')
  const query = q.trim().slice(0, 120)
  const res = query ? await search(query, locale) : null
  const total = res ? res.listings.length + res.guides.length + res.articles.length : 0

  return (
    <>
      <section className="zellige border-b border-line">
        <div className="wrap py-12 md:py-16">
          <h1 className="text-[2.4rem] leading-tight md:text-[3.2rem]">{t('title')}</h1>
          <p className="mt-3 text-lg text-ink-2">{t('lead')}</p>
          <div className="mt-8 max-w-3xl">
            <SearchBox locale={locale} defaultValue={query} autoFocus={!query} />
          </div>
        </div>
      </section>
      {res && (
        <div className="wrap py-12">
          <p className="text-ink-2" aria-live="polite">
            {t('results', { count: total, q: query })}
          </p>
          {total === 0 && (
            <p className="mt-6 max-w-xl text-lg">
              {t('noResults')}{' '}
              <Link href="/annuaire" className="text-sea underline underline-offset-4">
                →
              </Link>
            </p>
          )}
          {res.guides.length > 0 && (
            <section className="mt-10">
              <h2 className="mb-5 text-2xl">{t('guides')}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {res.guides.map((g) => (
                  <GuideCard key={g.id} g={g} locale={locale} />
                ))}
              </div>
            </section>
          )}
          {res.listings.length > 0 && (
            <section className="mt-12">
              <h2 className="mb-5 text-2xl">{t('listings')}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {res.listings.map((l) => (
                  <ListingCard key={l.id} l={l} locale={locale} />
                ))}
              </div>
            </section>
          )}
          {res.articles.length > 0 && (
            <section className="mt-12">
              <h2 className="mb-5 text-2xl">{t('articles')}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {res.articles.map((a) => (
                  <ArticleCard key={a.id} a={a} locale={locale} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  )
}
