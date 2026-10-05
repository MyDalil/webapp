'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { openLogin } from './LoginDialog'
import { toast } from './toast'

const PRIMARY = [
  { href: '/explorer', label: 'Explorer', match: ['/', '/explorer'] },
  { href: '/installation', label: 'S’installer & Vivre', match: ['/installation', '/vie-pratique'] },
  { href: '/demarches', label: 'Démarches & Papiers', match: ['/demarches'] },
]

const MEGA: { kicker: string; links: [string, string, string][] }[] = [
  {
    kicker: 'Découvrir',
    links: [
      ['/annuaire', 'Annuaire & Adresses', 'Trouver un lieu fiable'],
      ['/guides', 'Guides', 'Comprendre et préparer'],
      ['/actualites', 'Actualités', 'Ce qui change'],
    ],
  },
  {
    kicker: 'Business & Emploi',
    links: [
      ['/business-emploi', 'Business & Emploi', 'Investir, créer, travailler'],
      ['/guides/travail-et-entreprise', 'Création d’entreprise', 'Structurer son activité'],
      ['/recherche?q=Offres%20d%E2%80%99emploi', 'Offres d’emploi', 'Selon son métier et sa région'],
    ],
  },
  {
    kicker: 'Confiance',
    links: [
      ['/label', 'Label DALIL Excellence', 'Notre exigence de qualité'],
      ['/proposer', 'Contribuer', 'Partager une information'],
      ['/boutique', 'Accompagnements', 'Avancer avec un parcours clair'],
    ],
  },
  {
    kicker: 'Espaces',
    links: [
      ['/espace', 'Espace Particulier', 'Favoris et contributions'],
      ['/professionnels/espace', 'Espace Professionnel', 'Gérer son établissement'],
      ['/professionnels/rejoindre', 'Rejoindre l’annuaire', 'Présenter son activité'],
    ],
  },
]

const LANGS = [
  { code: 'fr', flag: '🇫🇷', label: 'Français', href: '/' },
  { code: 'ar', flag: '🇩🇿', label: 'العربية', href: '/ar' },
  { code: 'en', flag: '🇬🇧', label: 'English', href: '/en' },
]

export function Header() {
  const path = usePathname() || '/'
  const [menu, setMenu] = useState<null | 'more' | 'language'>(null)
  const [mobile, setMobile] = useState(false)
  const ref = useRef<HTMLElement>(null)
  const lang = path === '/ar' || path.startsWith('/ar/') ? 'ar' : path === '/en' || path.startsWith('/en/') ? 'en' : 'fr'
  const current = LANGS.find((l) => l.code === lang)!

  const [who, setWho] = useState<string | null>(null)

  useEffect(() => {
    setMenu(null)
    setMobile(false)
    fetch('/api/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setWho(j?.profile?.nickname ?? null))
      .catch(() => {})
  }, [path])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-menu],[data-menu-trigger]')) setMenu(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenu(null)
        setMobile(false)
      }
    }
    document.addEventListener('click', onDoc)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onDoc)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  const toggleTheme = () => {
    const html = document.documentElement
    const next = html.dataset.theme === 'dark' ? 'light' : 'dark'
    html.dataset.theme = next
    html.classList.toggle('dark', next === 'dark')
    try {
      localStorage.setItem('dalil-theme', next)
    } catch {}
  }

  const isActive = (m: string[]) => m.includes(path)

  return (
    <header className="site-header" id="site-header" ref={ref}>
      <div className="header-inner">
        <Link className="brand" href="/" aria-label="DALIL, accueil">
          <span className="brand-mark" aria-hidden="true">
            D
          </span>
          <span className="brand-word">DALIL</span>
        </Link>

        <nav className="primary-nav" aria-label="Navigation principale">
          {PRIMARY.map((p) => (
            <Link key={p.href} href={p.href} className={isActive(p.match) ? 'active' : undefined} aria-current={isActive(p.match) ? 'page' : undefined}>
              {p.label}
            </Link>
          ))}
          <div className="menu-wrap">
            <button className="nav-more" type="button" data-menu-trigger="more" aria-expanded={menu === 'more'} onClick={() => setMenu(menu === 'more' ? null : 'more')}>
              Plus{' '}
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="m4 6 4 4 4-4" />
              </svg>
            </button>
            <div className="mega-menu mega-menu-4" data-menu="more" hidden={menu !== 'more'}>
              {MEGA.map((col) => (
                <div key={col.kicker}>
                  <span className="menu-kicker">{col.kicker}</span>
                  {col.links.map(([href, label, sub]) => (
                    <Link key={href} href={href}>
                      {label} <small>{sub}</small>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </nav>

        <div className="header-actions">
          <div className="utility-wrap">
            <button className="icon-button flag-button" type="button" data-menu-trigger="language" aria-label="Changer de langue" aria-expanded={menu === 'language'} onClick={() => setMenu(menu === 'language' ? null : 'language')}>
              {current.flag}
            </button>
            <div className="utility-menu language-menu" data-menu="language" hidden={menu !== 'language'}>
              {LANGS.map((l) => (
                <Link key={l.code} href={l.href} role="button" data-language={l.code} onClick={() => l.code !== 'fr' && toast(`${l.label} — version en préparation`)}>
                  <span>{l.flag}</span> {l.label} {l.code === lang && <b>✓</b>}
                </Link>
              ))}
            </div>
          </div>
          <button className="icon-button theme-button" type="button" aria-label="Changer d’apparence" onClick={toggleTheme}>
            <svg className="sun" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
            </svg>
          </button>
          {who ? (
            <Link className="login-button" href="/espace">
              Mon espace
            </Link>
          ) : (
            <button className="login-button" type="button" onClick={openLogin}>
              Connexion
            </button>
          )}
          <button className="hamburger" type="button" aria-label={mobile ? 'Fermer la navigation' : 'Ouvrir la navigation'} aria-expanded={mobile} onClick={() => setMobile(!mobile)}>
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
      <div className="mobile-menu" hidden={!mobile}>
        <Link href="/explorer">Explorer</Link>
        <Link href="/installation">S’installer &amp; Vivre</Link>
        <Link href="/demarches">Démarches &amp; Papiers</Link>
        <Link href="/annuaire">Annuaire &amp; Adresses</Link>
        <Link href="/guides">Guides</Link>
        <Link href="/actualites">Actualités</Link>
        <Link href="/business-emploi">Business &amp; Emploi</Link>
        <Link href="/label">Label DALIL Excellence</Link>
        <Link href="/proposer">Contribuer</Link>
        <div className="mobile-spaces">
          <Link href="/espace">Espace Particulier</Link>
          <Link href="/professionnels/espace">Espace Professionnel</Link>
        </div>
      </div>
    </header>
  )
}
