import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server'
import { ArrowLeft, Info } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { getGuide, getGuides, getSectors, pick, tx } from '@/lib/data'
import { GuideCard, MediaImage } from '@/components/Cards'
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
  const g = await getGuide(slug)
  if (!g) return {}
  return { title: tx(g.title as never, locale), description: tx(g.summary as never, locale) }
}

export default async function GuidePage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const t = await getTranslations('guides')
  const th = await getTranslations('themes')
  const c = await getTranslations('common')
  const fmt = await getFormatter()
  const g = await getGuide(slug)
  if (!g) notFound()
  const [all, sectors] = await Promise.all([getGuides(g.theme), getSectors()])
  const related = all.filter((x) => x.id !== g.id).slice(0, 3)
  const linkedSectors = sectors.filter((s) => (typeof s.guide === 'object' ? s.guide?.id : s.guide) === g.id)
  const fallback = pick(g.title as never, locale).fallback

  return (
    <article>
      <header className="zellige border-b border-line">
        <div className="wrap py-12 md:py-16">
          <Link href="/guides" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-sea">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" /> {t('back')}
          </Link>
          <p className="kicker mt-6">{th(g.theme)}</p>
          <T v={g.title as never} locale={locale} as="h1" className="mt-3 block max-w-4xl text-[2.4rem] leading-[1.05] md:text-[3.4rem]" />
          <T v={g.summary as never} locale={locale} as="p" className="mt-5 block max-w-2xl text-lg text-ink-2 md:text-xl" />
          {g.reviewedAt && <p className="mt-6 text-sm text-muted">{t('reviewed', { date: fmt.dateTime(new Date(g.reviewedAt), { dateStyle: 'long' }) })}</p>}
        </div>
      </header>

      <div className="wrap grid gap-12 py-12 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0">
          <FallbackNotice show={fallback}>{c('translationPending')}</FallbackNotice>
          {g.cover && (
            <div className="relative mb-10 aspect-[16/8] overflow-hidden rounded-[1.25rem]">
              <MediaImage media={g.cover as Media} locale={locale} sizes="(min-width:1024px) 60vw, 100vw" priority />
            </div>
          )}
          {!!g.checklist?.length && (
            <section aria-labelledby="etapes">
              <h2 id="etapes" className="text-2xl">
                {t('steps')}
              </h2>
              <ol className="mt-6 space-y-0">
                {g.checklist.map((s, i) => (
                  <li key={s.id} className="relative flex gap-5 pb-8 last:pb-0">
                    {i < g.checklist!.length - 1 && <span className="absolute start-[1.2rem] top-11 bottom-0 w-px bg-line" aria-hidden="true" />}
                    <span className="num grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line-strong bg-surface text-lg text-sea">{i + 1}</span>
                    <T v={s.text as never} locale={locale} as="p" className="pt-1.5 text-[1.0625rem] text-ink-2" />
                  </li>
                ))}
              </ol>
            </section>
          )}
          <Rich v={g.body as never} locale={locale} className="prose-dalil mt-10" />
          <p className="mt-10 flex gap-3 rounded-xl bg-sunk p-5 text-sm text-ink-2">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-sea" aria-hidden="true" />
            {t('disclaimer')}
          </p>
          {!!g.sources?.length && (
            <div className="mt-8">
              <p className="kicker !text-muted">Sources</p>
              <ul className="mt-3 space-y-1 text-sm">
                {g.sources.map((s) => (
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
            </div>
          )}
        </div>
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {linkedSectors.length > 0 && (
            <div className="card p-5">
              <p className="kicker !text-muted">{t('related')}</p>
              <ul className="mt-3 space-y-2">
                {linkedSectors.map((s) => (
                  <li key={s.id}>
                    <Link href={`/annuaire/${s.slug}`} className="font-medium text-sea hover:underline">
                      {tx(s.title as never, locale)} →
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {related.length > 0 && (
        <section className="wrap pb-8">
          <div className="grid gap-4 md:grid-cols-3">
            {related.map((r) => (
              <GuideCard key={r.id} g={r} locale={locale} />
            ))}
          </div>
        </section>
      )}
    </article>
  )
}
