import { getTranslations } from 'next-intl/server'
import { MapPin } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { getGuides, getWilayas, tx } from '@/lib/data'
import { GuideCard, PageHero, SectionHead } from './Cards'
import { SearchBox } from './SearchBox'
import type { Locale } from '@/i18n/routing'

type Theme = 'installation' | 'demarches' | 'quotidien' | 'decouvrir' | 'business'

export async function ThemePage({ theme, locale, showWilayas }: { theme: Theme; locale: Locale; showWilayas?: boolean }) {
  const th = await getTranslations('themes')
  const g = await getTranslations('guides')
  const [guides, wilayas] = await Promise.all([getGuides(theme), showWilayas ? getWilayas() : Promise.resolve([])])
  const featured = wilayas.filter((w) => w.featured)
  return (
    <>
      <PageHero kicker={g('title')} title={th(theme)} lead={th(`${theme}Lead`)}>
        <div className="mt-8 max-w-2xl">
          <SearchBox locale={locale} size="md" />
        </div>
      </PageHero>
      <section className="wrap py-14">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map((x, i) => (
            <GuideCard key={x.id} g={x} locale={locale} index={i} />
          ))}
        </div>
      </section>
      {showWilayas && featured.length > 0 && (
        <section id="wilayas" className="wrap pb-10">
          <SectionHead title={th('wilayasTitle')} lead={th('wilayasLead')} />
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {featured.map((w) => (
              <li key={w.id}>
                <Link href={{ pathname: '/recherche', query: { q: tx(w.name as never, 'fr') } }} className="card flex flex-col gap-2 p-4">
                  <span className="num text-2xl text-terra">{String(w.code).padStart(2, '0')}</span>
                  <span className="inline-flex items-center gap-1 font-medium">
                    <MapPin className="h-4 w-4 text-sea" aria-hidden="true" />
                    {tx(w.name as never, locale)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
