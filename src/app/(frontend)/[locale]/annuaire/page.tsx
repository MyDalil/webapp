import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ArrowRight } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { countListingsBySector, getSectors, getSpecialties, tx } from '@/lib/data'
import { PageHero } from '@/components/Cards'
import { SectorIcon } from '@/components/Icon'
import type { Locale } from '@/i18n/routing'

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'directory' })
  return { title: t('title'), description: t('lead') }
}

export default async function DirectoryPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('directory')
  const [sectors, specialties, counts] = await Promise.all([getSectors(), getSpecialties(), countListingsBySector()])
  return (
    <>
      <PageHero kicker={t('title')} title={t('lead')} />
      <section className="wrap py-14">
        <ol className="grid gap-4 md:grid-cols-2">
          {sectors.map((s, i) => {
            const specs = specialties.filter((sp) => (typeof sp.sector === 'object' ? sp.sector.id : sp.sector) === s.id)
            return (
              <li key={s.id} className="card p-6 md:p-7">
                <Link href={`/annuaire/${s.slug}`} className="group flex items-start gap-4">
                  <span className="num pt-1 text-2xl text-terra">{String(i + 1).padStart(2, '0')}</span>
                  <span className="flex-1">
                    <span className="flex items-center gap-2.5">
                      <SectorIcon name={s.icon} className="h-6 w-6 text-sea" />
                      <span className="font-display text-[1.45rem] leading-tight text-ink group-hover:text-sea">{tx(s.title as never, locale)}</span>
                    </span>
                    <span className="mt-1.5 block text-ink-2">{tx(s.intro as never, locale)}</span>
                    <span className="mt-2 block text-sm text-muted">{t('listings', { count: counts.get(s.id) ?? 0 })}</span>
                  </span>
                  <ArrowRight className="mt-2 h-5 w-5 text-muted transition-transform group-hover:translate-x-1 rtl:rotate-180" aria-hidden="true" />
                </Link>
                {specs.length > 0 && (
                  <ul className="mt-5 flex flex-wrap gap-2 ps-12">
                    {specs.map((sp) => (
                      <li key={sp.id}>
                        <Link
                          href={{ pathname: `/annuaire/${s.slug}`, query: { specialite: sp.slug } }}
                          className="inline-flex min-h-9 items-center rounded-full bg-sunk px-3.5 text-sm text-ink-2 transition-colors hover:bg-sea-soft hover:text-sea"
                        >
                          {tx(sp.title as never, locale)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ol>
      </section>
    </>
  )
}
