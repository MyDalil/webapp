import { getTranslations } from 'next-intl/server'
import { Search } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { Logo } from './Brand'
import { LocaleSwitcher, MobileMenu, ThemeToggle, NavLink, BottomBar } from './HeaderClient'
import type { Locale } from '@/i18n/routing'

export const NAV = [
  { href: '/explorer', key: 'explorer' },
  { href: '/installation', key: 'installation' },
  { href: '/demarches', key: 'demarches' },
  { href: '/annuaire', key: 'annuaire' },
  { href: '/guides', key: 'guides' },
  { href: '/actualites', key: 'actualites' },
] as const

export const NAV_MORE = [
  { href: '/vie-pratique', key: 'quotidien' },
  { href: '/business-emploi', key: 'business' },
  { href: '/proposer', key: 'propose' },
  { href: '/professionnels', key: 'pro' },
] as const

export async function Header({ locale }: { locale: Locale }) {
  const t = await getTranslations('nav')
  const items = NAV.map((n) => ({ href: n.href, label: t(n.key) }))
  const more = NAV_MORE.map((n) => ({ href: n.href, label: t(n.key) }))
  return (
    <>
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2">
        {t('skip')}
      </a>
      <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/75">
        <div className="wrap flex h-16 items-center gap-4 lg:h-[4.5rem]">
          <Link href="/" aria-label="DALIL — accueil" className="shrink-0 rounded-lg">
            <Logo locale={locale} />
          </Link>
          <nav aria-label="Navigation principale" className="ms-6 hidden lg:block">
            <ul className="flex items-center gap-1">
              {items.map((i) => (
                <li key={i.href}>
                  <NavLink href={i.href}>{i.label}</NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ms-auto flex items-center gap-1.5">
            <Link
              href="/recherche"
              aria-label={t('search')}
              className="grid h-11 w-11 place-items-center rounded-full text-ink-2 transition-colors hover:bg-sunk hover:text-ink"
            >
              <Search className="h-5 w-5" aria-hidden="true" />
            </Link>
            <div className="hidden items-center gap-1.5 md:flex">
              <LocaleSwitcher locale={locale} label={t('language')} />
              <ThemeToggle label={t('theme')} />
              <Link href="/proposer" className="btn btn-primary ms-2 !min-h-10 !px-4 text-sm">
                {t('propose')}
              </Link>
            </div>
            <MobileMenu
              locale={locale}
              items={[...items, ...more]}
              labels={{ menu: t('menu'), close: t('close'), language: t('language'), theme: t('theme') }}
            />
          </div>
        </div>
      </header>
      <BottomBar
        items={[
          { href: '/', label: t('home'), icon: 'home' },
          { href: '/explorer', label: t('explorer'), icon: 'compass' },
          { href: '/annuaire', label: t('annuaire'), icon: 'book' },
          { href: '/installation', label: t('installation'), icon: 'route' },
          { href: '/recherche', label: t('search'), icon: 'search' },
        ]}
      />
    </>
  )
}
