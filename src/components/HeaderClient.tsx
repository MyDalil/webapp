'use client'

import { useEffect, useState, type ReactNode } from 'react'
import clsx from 'clsx'
import { BookOpen, Compass, House, Menu, Moon, Route, Search, Sun, X } from 'lucide-react'
import { Link, usePathname } from '@/i18n/navigation'
import { locales, type Locale } from '@/i18n/routing'

const LOCALE_LABEL: Record<Locale, string> = { fr: 'FR', en: 'EN', ar: 'ع' }
const LOCALE_NAME: Record<Locale, string> = { fr: 'Français', en: 'English', ar: 'العربية' }

function useActive(href: string) {
  const path = usePathname()
  return href === '/' ? path === '/' : path === href || path.startsWith(href + '/')
}

export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const active = useActive(href)
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={clsx(
        'relative rounded-full px-3.5 py-2 text-[0.95rem] font-medium transition-colors',
        active ? 'text-sea' : 'text-ink-2 hover:bg-sunk hover:text-ink',
      )}
    >
      {children}
      {active && <span className="absolute inset-x-3.5 -bottom-[13px] h-0.5 rounded-full bg-sea lg:-bottom-[17px]" />}
    </Link>
  )
}

export function LocaleSwitcher({ locale, label, full }: { locale: Locale; label: string; full?: boolean }) {
  const path = usePathname()
  return (
    <div role="group" aria-label={label} className="flex items-center rounded-full border border-line p-0.5">
      {locales.map((l) => (
        <Link
          key={l}
          href={path}
          locale={l}
          lang={l}
          aria-current={l === locale ? 'true' : undefined}
          aria-label={LOCALE_NAME[l]}
          className={clsx(
            'grid h-9 min-w-9 place-items-center rounded-full px-2 text-sm font-semibold transition-colors',
            l === locale ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink',
          )}
        >
          {full ? LOCALE_NAME[l] : LOCALE_LABEL[l]}
        </Link>
      ))}
    </div>
  )
}

export function ThemeToggle({ label }: { label: string }) {
  const [dark, setDark] = useState<boolean | null>(null)
  useEffect(() => setDark(document.documentElement.dataset.theme === 'dark'), [])
  const toggle = () => {
    const next = !(document.documentElement.dataset.theme === 'dark')
    document.documentElement.dataset.theme = next ? 'dark' : 'light'
    try {
      localStorage.setItem('dalil-theme', next ? 'dark' : 'light')
    } catch {}
    setDark(next)
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      aria-pressed={dark ?? undefined}
      className="grid h-11 w-11 place-items-center rounded-full text-ink-2 transition-colors hover:bg-sunk hover:text-ink"
    >
      {dark ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
    </button>
  )
}

export function MobileMenu({
  locale,
  items,
  labels,
}: {
  locale: Locale
  items: { href: string; label: string }[]
  labels: { menu: string; close: string; language: string; theme: string }
}) {
  const [open, setOpen] = useState(false)
  const path = usePathname()
  useEffect(() => setOpen(false), [path])
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="menu-mobile"
        aria-label={labels.menu}
        className="grid h-11 w-11 place-items-center rounded-full text-ink hover:bg-sunk"
      >
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>
      {open && (
        <div id="menu-mobile" role="dialog" aria-modal="true" aria-label={labels.menu} className="fixed inset-0 z-50 flex flex-col bg-paper">
          <div className="wrap flex h-16 items-center justify-between border-b border-line">
            <span className="font-display text-lg">{labels.menu}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={labels.close}
              className="grid h-11 w-11 place-items-center rounded-full hover:bg-sunk"
              autoFocus
            >
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <nav className="wrap flex-1 overflow-y-auto py-4" aria-label={labels.menu}>
            <ul className="divide-y divide-line">
              {items.map((i) => (
                <li key={i.href}>
                  <Link href={i.href} className="flex min-h-14 items-center font-display text-2xl text-ink">
                    {i.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="wrap flex items-center justify-between gap-3 border-t border-line py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <LocaleSwitcher locale={locale} label={labels.language} full />
            <ThemeToggle label={labels.theme} />
          </div>
        </div>
      )}
    </div>
  )
}

const ICONS = { home: House, compass: Compass, book: BookOpen, route: Route, search: Search }

export function BottomBar({ items }: { items: { href: string; label: string; icon: keyof typeof ICONS }[] }) {
  return (
    <nav
      aria-label="Navigation rapide"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-5">
        {items.map((i) => (
          <BottomItem key={i.href} {...i} Icon={ICONS[i.icon]} />
        ))}
      </ul>
    </nav>
  )
}

function BottomItem({ href, label, Icon }: { href: string; label: string; Icon: (typeof ICONS)[keyof typeof ICONS] }) {
  const active = useActive(href)
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className={clsx('flex min-h-[3.75rem] flex-col items-center justify-center gap-1 text-[0.72rem] font-medium', active ? 'text-sea' : 'text-muted')}
      >
        <Icon className="h-[1.35rem] w-[1.35rem]" aria-hidden="true" strokeWidth={active ? 2.2 : 1.7} />
        <span className="max-w-full truncate px-1">{label}</span>
      </Link>
    </li>
  )
}
