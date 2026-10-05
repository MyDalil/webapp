import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server'
import { getArticle, pick, tx } from '@/lib/data'
import { MediaImage } from '@/components/Cards'
import { FallbackNotice, Rich, T } from '@/components/Localized'
import type { Locale } from '@/i18n/routing'
import type { Media } from '@/payload-types'


// Rendu à la demande puis mis en cache ; purgé à chaque publication.
export const revalidate = 86400
export async function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ locale: Locale; slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const a = await getArticle(slug)
  if (!a) return {}
  return { title: tx(a.title as never, locale), description: tx(a.summary as never, locale), openGraph: { type: 'article', publishedTime: a.publishedAt ?? undefined } }
}

export default async function ArticlePage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const t = await getTranslations('news')
  const c = await getTranslations('common')
  const fmt = await getFormatter()
  const a = await getArticle(slug)
  if (!a) notFound()
  return (
    <article className="wrap max-w-4xl py-12 md:py-16">
      <p className="kicker">{a.category}</p>
      <T v={a.title as never} locale={locale} as="h1" className="mt-3 block text-[2.3rem] leading-[1.08] md:text-[3.2rem]" />
      <T v={a.summary as never} locale={locale} as="p" className="mt-5 block text-xl text-ink-2" />
      {a.publishedAt && <p className="mt-5 text-sm text-muted">{t('published', { date: fmt.dateTime(new Date(a.publishedAt), { dateStyle: 'long' }) })}</p>}
      {a.cover && (
        <div className="relative my-10 aspect-[16/9] overflow-hidden rounded-[1.25rem]">
          <MediaImage media={a.cover as Media} locale={locale} sizes="(min-width:1024px) 900px, 100vw" priority />
        </div>
      )}
      <div className="mt-8">
        <FallbackNotice show={pick(a.title as never, locale).fallback}>{c('translationPending')}</FallbackNotice>
        <Rich v={a.body as never} locale={locale} />
      </div>
      {!!a.sources?.length && (
        <footer className="mt-12 border-t border-line pt-6">
          <p className="kicker !text-muted">Sources</p>
          <ul className="mt-3 space-y-1 text-sm">
            {a.sources.map((s) => (
              <li key={s.id}>
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-sea underline underline-offset-4">
                    {s.label}
                  </a>
                ) : (
                  s.label
                )}
              </li>
            ))}
          </ul>
        </footer>
      )}
    </article>
  )
}
