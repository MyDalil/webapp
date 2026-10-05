import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server'
import { getPage, pick, tx } from '@/lib/data'
import { PageHero } from '@/components/Cards'
import { FallbackNotice, Rich } from '@/components/Localized'
import type { Locale } from '@/i18n/routing'


// Rendu à la demande puis mis en cache ; purgé à chaque publication.
export const revalidate = 86400
export async function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ locale: Locale; page: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, page } = await params
  const p = await getPage(page)
  if (!p) return {}
  return { title: tx(p.title as never, locale), description: tx(p.intro as never, locale) || undefined }
}

export default async function CmsPage({ params }: Props) {
  const { locale, page } = await params
  setRequestLocale(locale)
  const p = await getPage(page)
  if (!p) notFound()
  const c = await getTranslations('common')
  const fmt = await getFormatter()
  return (
    <>
      <PageHero title={tx(p.title as never, locale)} lead={tx(p.intro as never, locale) || undefined} />
      <div className="wrap py-12">
        <FallbackNotice show={pick(p.title as never, locale).fallback}>{c('translationPending')}</FallbackNotice>
        <Rich v={p.body as never} locale={locale} />
        <p className="mt-12 text-sm text-muted">{c('updated', { date: fmt.dateTime(new Date(p.updatedAt), { dateStyle: 'long' }) })}</p>
      </div>
    </>
  )
}
