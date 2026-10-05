import { Search } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { getPathname } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'

export async function SearchBox({ locale, defaultValue, size = 'lg', autoFocus }: { locale: Locale; defaultValue?: string; size?: 'lg' | 'md'; autoFocus?: boolean }) {
  const t = await getTranslations('home')
  const s = await getTranslations('search')
  const action = getPathname({ href: '/recherche', locale })
  return (
    <form action={action} method="get" role="search" className="relative">
      <label htmlFor="q" className="sr-only">
        {t('searchLabel')}
      </label>
      <Search className="pointer-events-none absolute start-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden="true" />
      <input
        id="q"
        name="q"
        type="search"
        defaultValue={defaultValue}
        autoFocus={autoFocus}
        placeholder={t('searchPlaceholder')}
        enterKeyHint="search"
        className={`w-full rounded-full border border-line-strong bg-surface ps-13 pe-32 text-ink shadow-[0_10px_30px_-18px_rgb(15_76_92/0.45)] placeholder:text-muted focus:border-sea focus:outline-none focus:ring-4 focus:ring-sea/15 ${size === 'lg' ? 'h-16 text-lg' : 'h-14 text-base'}`}
      />
      <button type="submit" className="btn btn-primary absolute end-2 top-1/2 -translate-y-1/2 !min-h-12">
        {s('submit')}
      </button>
    </form>
  )
}
