import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { getArticles } from '@/lib/data'
import { ArticleCard, PageHero } from '@/components/Cards'
import { NewsletterForm } from '@/components/Forms'
import type { Locale } from '@/i18n/routing'

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'news' })
  return { title: t('title'), description: t('lead') }
}

export default async function NewsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('news')
  const n = await getTranslations('nav')
  const articles = await getArticles(60)
  return (
    <>
      <PageHero kicker={t('title')} title={t('lead')} />
      <section className="wrap py-14">
        {articles.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => (
              <ArticleCard key={a.id} a={a} locale={locale} />
            ))}
          </div>
        ) : (
          <div className="card zellige grid gap-6 px-6 py-14 md:grid-cols-2 md:items-center md:px-12">
            <div>
              <p className="font-display text-2xl">{t('empty')}</p>
              <Link href="/guides" className="mt-4 inline-block font-semibold text-sea">
                {n('guides')} →
              </Link>
            </div>
            <NewsletterForm />
          </div>
        )}
      </section>
    </>
  )
}
