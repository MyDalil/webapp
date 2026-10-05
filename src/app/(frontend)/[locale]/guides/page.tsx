import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getGuides } from '@/lib/data'
import { GuideCard, PageHero, SectionHead } from '@/components/Cards'
import type { Locale } from '@/i18n/routing'

const ORDER = ['installation', 'demarches', 'quotidien', 'decouvrir', 'business'] as const

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'guides' })
  return { title: t('title'), description: t('lead') }
}

export default async function GuidesPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('guides')
  const th = await getTranslations('themes')
  const guides = await getGuides()
  return (
    <>
      <PageHero kicker={t('title')} title={t('lead')} />
      {ORDER.map((theme) => {
        const list = guides.filter((g) => g.theme === theme)
        if (!list.length) return null
        return (
          <section key={theme} className="wrap py-12 md:py-16">
            <SectionHead title={th(theme)} lead={th(`${theme}Lead`)} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((g, i) => (
                <GuideCard key={g.id} g={g} locale={locale} index={i} />
              ))}
            </div>
          </section>
        )
      })}
    </>
  )
}
