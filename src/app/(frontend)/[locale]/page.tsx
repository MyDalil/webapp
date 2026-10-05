import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ArrowRight, Compass, Coffee, Route, ShieldCheck, CalendarCheck, BadgeX } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { countListingsBySector, getArticles, getGuides, getHome, getSectors, tx } from '@/lib/data'
import { SearchBox } from '@/components/SearchBox'
import { ArticleCard, GuideCard, MediaImage, SectionHead } from '@/components/Cards'
import { SectorIcon } from '@/components/Icon'
import { Khatam, StarRule } from '@/components/Brand'
import type { Locale } from '@/i18n/routing'
import type { Guide, Media } from '@/payload-types'

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('home')
  const d = await getTranslations('directory')
  const [home, sectors, counts, guides, articles] = await Promise.all([getHome(), getSectors(), countListingsBySector(), getGuides(), getArticles(3)])

  const featured = ((home.featuredGuides as Guide[] | undefined)?.filter((g) => typeof g === 'object' && g._status === 'published') ?? []).slice(0, 6)
  const shownGuides = featured.length ? featured : guides.slice(0, 6)
  const suggestions = (home.suggestions ?? []).map((s) => tx(s.text as never, locale)).filter(Boolean)
  const title = tx(home.title as never, locale) || t('title')
  const subtitle = tx(home.subtitle as never, locale) || t('subtitle')
  const kicker = tx(home.kicker as never, locale) || t('kicker')
  const announcement = tx(home.announcement as never, locale)

  const pillars = [
    { href: '/explorer', title: t('pillar1'), text: t('pillar1Text'), Icon: Compass },
    { href: '/vie-pratique', title: t('pillar2'), text: t('pillar2Text'), Icon: Coffee },
    { href: '/installation', title: t('pillar3'), text: t('pillar3Text'), Icon: Route },
  ]

  return (
    <>
      {announcement && (
        <div className="bg-sea text-on-sea">
          <p className="wrap py-2.5 text-center text-sm font-medium">{announcement}</p>
        </div>
      )}

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="zellige absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" aria-hidden="true" />
        <Khatam className="pointer-events-none absolute -end-40 -top-24 hidden h-[34rem] w-[34rem] text-sea/[0.07] lg:block" strokeWidth={0.6} />
        <div className="wrap relative grid gap-12 py-14 md:py-24 lg:grid-cols-[1.25fr_1fr] lg:items-center">
          <div>
            <p className="kicker">{kicker}</p>
            <h1 className="mt-4 text-[2.75rem] leading-[1.02] text-ink sm:text-[3.6rem] lg:text-[4.6rem]">{title}</h1>
            <p className="mt-6 max-w-xl text-lg text-ink-2 md:text-xl">{subtitle}</p>
            <div className="mt-9 max-w-2xl">
              <SearchBox locale={locale} />
            </div>
            {suggestions.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <li key={s}>
                    <Link
                      href={{ pathname: '/recherche', query: { q: s } }}
                      className="inline-flex min-h-10 items-center rounded-full border border-line bg-surface px-4 text-sm text-ink-2 transition-colors hover:border-sea hover:text-sea"
                    >
                      {s}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="relative hidden aspect-[4/5] overflow-hidden rounded-[2rem] border border-line bg-sea-soft lg:block">
            {home.heroImage ? (
              <MediaImage media={home.heroImage as Media} locale={locale} sizes="40vw" priority />
            ) : (
              <div className="zellige flex h-full flex-col justify-between p-8">
                <Khatam className="h-10 w-10 text-terra" />
                <div>
                  <p lang="ar" dir="rtl" className="text-end text-[9.5rem] leading-[1.1] text-sea" style={{ fontFamily: "'Noto Naskh Arabic Variable', serif" }}>
                    دليل
                  </p>
                  <p className="mt-6 border-t border-sea/20 pt-4 font-display text-xl text-ink">
                    {locale === 'ar' ? 'دليل: المرشد الذي يدلّك على الطريق.' : locale === 'en' ? 'Dalil — “the guide”, in Arabic.' : 'Dalil — « le guide », en arabe.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── Trois entrées ─── */}
      <section className="wrap py-16 md:py-24" aria-labelledby="piliers">
        <h2 id="piliers" className="sr-only">
          {t('pillarsTitle')}
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {pillars.map(({ href, title, text, Icon }, i) => (
            <Link key={href} href={href} className="card group relative overflow-hidden p-7">
              <span className="num absolute end-6 top-5 text-5xl text-line-strong">{String(i + 1).padStart(2, '0')}</span>
              <Icon className="h-7 w-7 text-sea" aria-hidden="true" strokeWidth={1.6} />
              <h3 className="mt-8 text-[1.75rem] text-ink">{title}</h3>
              <p className="mt-2 text-ink-2">{text}</p>
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-sea">
                {t('seeAll')} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── Annuaire ─── */}
      <section className="border-y border-line bg-surface py-16 md:py-24">
        <div className="wrap">
          <SectionHead
            kicker={d('title')}
            title={t('directoryTitle')}
            lead={t('directoryText')}
            action={
              <Link href="/annuaire" className="btn btn-ghost self-start md:self-auto">
                {t('seeAll')} <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
            }
          />
          <ul className="grid grid-cols-1 border-t border-line sm:grid-cols-2 lg:grid-cols-3">
            {sectors.map((s, i) => {
              const n = counts.get(s.id) ?? 0
              return (
                <li key={s.id} className="border-b border-line sm:odd:border-e lg:border-e lg:[&:nth-child(3n)]:border-e-0">
                  <Link href={`/annuaire/${s.slug}`} className="group flex items-center gap-4 px-2 py-5 transition-colors hover:bg-paper sm:px-5">
                    <span className="num w-8 text-lg text-terra">{String(i + 1).padStart(2, '0')}</span>
                    <SectorIcon name={s.icon} className="h-6 w-6 shrink-0 text-sea" />
                    <span className="flex-1">
                      <span className="block font-medium text-ink">{tx(s.title as never, locale)}</span>
                      <span className="text-sm text-muted">{d('listings', { count: n })}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted opacity-0 transition-opacity group-hover:opacity-100 rtl:rotate-180" aria-hidden="true" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      {/* ─── Guides ─── */}
      {shownGuides.length > 0 && (
        <section className="wrap py-16 md:py-24">
          <SectionHead
            kicker={t('guidesTitle')}
            title={t('guidesText')}
            action={
              <Link href="/guides" className="btn btn-ghost self-start md:self-auto">
                {t('seeAll')} <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
            }
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shownGuides.map((g, i) => (
              <GuideCard key={g.id} g={g} locale={locale} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* ─── Installation ─── */}
      <section className="wrap">
        <div className="relative overflow-hidden rounded-[2rem] bg-sea px-6 py-14 text-on-sea md:px-14 md:py-20">
          <Khatam className="pointer-events-none absolute -bottom-24 -end-24 h-96 w-96 text-on-sea/10" strokeWidth={0.7} />
          <div className="relative max-w-2xl">
            <p className="kicker !text-on-sea/70">{t('pillar3')}</p>
            <h2 className="mt-3 text-[2.2rem] leading-[1.08] md:text-[3rem]">{t('installTitle')}</h2>
            <p className="mt-4 text-lg text-on-sea/85">{t('installText')}</p>
            <Link href="/installation" className="btn mt-8 bg-on-sea text-sea hover:bg-paper">
              {t('installCta')} <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Méthode ─── */}
      <section className="wrap py-16 md:py-24">
        <StarRule className="mb-12" />
        <div className="grid gap-10 md:grid-cols-[1fr_2fr]">
          <h2 className="text-[2rem] leading-tight md:text-[2.4rem]">{t('trustTitle')}</h2>
          <ul className="grid gap-6 sm:grid-cols-3">
            {[
              { Icon: CalendarCheck, text: t('trust1') },
              { Icon: ShieldCheck, text: t('trust2') },
              { Icon: BadgeX, text: t('trust3') },
            ].map(({ Icon, text }) => (
              <li key={text} className="border-s-2 border-terra ps-4">
                <Icon className="h-6 w-6 text-terra" aria-hidden="true" strokeWidth={1.6} />
                <p className="mt-3 text-ink-2">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ─── Actualités ─── */}
      {articles.length > 0 && (
        <section className="wrap pb-16 md:pb-24">
          <div className="grid gap-4 md:grid-cols-3">
            {articles.map((a) => (
              <ArticleCard key={a.id} a={a} locale={locale} />
            ))}
          </div>
        </section>
      )}

    </>
  )
}
