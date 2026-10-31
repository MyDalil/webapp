'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { toast } from './toast'
import { RUBRICS, rubricOf, type Rubric } from './nav'
import { NavIcon } from './NavIcon'
import { QuickFind } from './QuickFind'
import { WilayaPicker } from './WilayaPicker'
import { readWilaya, setWilaya, wilayaByCode } from './wilaya'

type Slide = { photo: string; place: string; href: string; credit: string | null }
type Menu = null | Rubric['key'] | 'language' | 'wilaya'

const LANGS = [
  { code: 'fr', flag: '🇫🇷', label: 'Français', href: '/' },
  { code: 'ar', flag: '🇩🇿', label: 'العربية', href: '/ar' },
  { code: 'en', flag: '🇬🇧', label: 'English', href: '/en' },
]

/** Menu latéral (maquette « Menu — mobile » validée par Rad, 2026-10-31) : couleur, pictogramme et résumé de chaque rubrique. */
const SHEET: Record<Rubric['key'], { color: string; ink?: string; hint: string; label?: string; icon: string }> = {
  musulmane: { color: '#0F7A4A', hint: 'Mosquées, Hajj, entraide', icon: 'M12 2c2 2 4 3 4 6H8c0-3 2-4 4-6ZM6 8h12v13H6zM3 21h18M10 21v-5a2 2 0 0 1 4 0v5' },
  services: { color: '#1A56DB', hint: 'Médecins, artisans, aide à domicile', icon: 'M12 21s-8-4.5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.5-8 11-8 11ZM8 12h2l1-2 2 4 1-2h2' },
  decouvrir: { color: '#C2410C', hint: 'Sites, sorties, week-end', icon: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM15.5 8.5l-2 5-5 2 2-5 5-2Z' },
  demarches: { color: '#6D28D9', hint: 'Papiers, administrations, consulats', icon: 'M14 3H6v18h12V7l-4-4ZM14 3v4h4M9 13h6M9 17h6' },
  annonces: { color: '#BE185D', hint: 'Immobilier, emploi, véhicules, objets', icon: 'M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9ZM7.5 6v3' },
  vivre: { color: '#FACC15', ink: '#14201B', hint: 'Logement, école, banque, transports', icon: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z' },
  plus: { color: '#2A3A33', hint: 'Guides, actualités, critères, contribuer', label: 'Guides & infos', icon: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5ZM4 19a2 2 0 0 1 2-2h13M9 7h6' },
}

type Theme = 'light' | 'dark'

export function Header() {
  const path = usePathname() || '/'
  const [menu, setMenu] = useState<Menu>(null)
  const [slides, setSlides] = useState<Record<string, Slide[]> | null>(null)
  const [drawer, setDrawer] = useState<Rubric['key'] | null>(null)
  const hover = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [mobile, setMobile] = useState(false)
  const ref = useRef<HTMLElement>(null)
  const lang = path === '/ar' || path.startsWith('/ar/') ? 'ar' : path === '/en' || path.startsWith('/en/') ? 'en' : 'fr'
  const current = LANGS.find((l) => l.code === lang)!

  const [who, setWho] = useState<string | null>(null)
  const [theme, setThemeState] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)
  const burger = useRef<HTMLButtonElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const touch = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    setMounted(true)
    setThemeState(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
  }, [])

  // Menu ouvert : la page ne défile plus derrière ; le focus va sur « Fermer », puis revient sur le bouton menu.
  const wasOpen = useRef(false)
  useEffect(() => {
    const html = document.documentElement
    if (mobile) {
      html.classList.add('nav-sheet-lock')
      requestAnimationFrame(() => closeBtn.current?.focus())
    } else {
      html.classList.remove('nav-sheet-lock')
      if (wasOpen.current) burger.current?.focus({ preventScroll: true })
    }
    wasOpen.current = mobile
    return () => html.classList.remove('nav-sheet-lock')
  }, [mobile])

  useEffect(() => {
    setMenu(null)
    setMobile(false)
    fetch('/api/compte', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        setWho(j?.member ? (j.member.kind === 'pro' ? '/espace-pro' : '/mon-compte') : null)
        // Nouvel appareil : on reprend la wilaya enregistrée dans le compte.
        if (j?.member?.wilaya && !readWilaya()) setWilaya(wilayaByCode(j.member.wilaya), { sync: false })
      })
      .catch(() => {})
  }, [path])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-menu],[data-menu-trigger]')) setMenu(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Le focus revient sur le bouton qui avait ouvert le menu.
        ;(document.querySelector('[data-menu-trigger][aria-expanded="true"]') as HTMLElement | null)?.focus()
        setMenu(null)
        setMobile(false)
      }
    }
    // « Choisir ma wilaya » (cartes de l’accueil, page week-end) ouvre le sélecteur de l’en-tête.
    const onPick = () => {
      if (window.matchMedia('(max-width: 1340px)').matches) setMobile(true)
      setTimeout(() => setMenu('wilaya'), 0)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    document.addEventListener('click', onDoc)
    window.addEventListener('keydown', onKey)
    window.addEventListener('dalil:pick-wilaya', onPick)
    return () => {
      document.removeEventListener('click', onDoc)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('dalil:pick-wilaya', onPick)
    }
  }, [])

  const applyTheme = (next: Theme) => {
    const html = document.documentElement
    html.dataset.theme = next
    html.classList.toggle('dark', next === 'dark')
    setThemeState(next)
    try {
      localStorage.setItem('dalil-theme', next)
    } catch {}
  }
  const toggleTheme = () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark')
  const chooseLang = (l: (typeof LANGS)[number]) => {
    // Langue retenue aussi pour les noms des cartes (annuaire › DirectoryMap).
    try {
      localStorage.setItem('dalil-map-lang', l.code)
    } catch {}
    if (l.code !== 'fr') toast(`${l.label} — version en préparation`)
  }
  const close = () => setMobile(false)
  // Geste de fermeture : glisser le panneau vers son bord (droite, ou gauche en arabe).
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touch.current = { x: t.clientX, y: t.clientY }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touch.current
    touch.current = null
    if (!start) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    const rtl = document.documentElement.dir === 'rtl'
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && (rtl ? dx < 0 : dx > 0)) close()
  }

  useEffect(() => {
    if (!menu || slides || menu === 'language' || menu === 'wilaya') return
    fetch('/api/vitrine')
      .then((r) => (r.ok ? r.json() : {}))
      .then(setSlides)
      .catch(() => setSlides({}))
  }, [menu, slides])

  const active = rubricOf(path)
  const isRubric = (m: Menu): m is Rubric['key'] => !!m && m !== 'language' && m !== 'wilaya'
  // Souris : ouverture après un court temps de survol, fermeture en quittant l’en-tête. Le clic reste l’action principale.
  const hoverOpen = (key: Rubric['key'], e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    if (hover.current) clearTimeout(hover.current)
    hover.current = setTimeout(() => setMenu((m) => (m === 'language' || m === 'wilaya' ? m : key)), isRubric(menu) ? 0 : 140)
  }
  const hoverLeave = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    if (hover.current) clearTimeout(hover.current)
    hover.current = setTimeout(() => setMenu((m) => (isRubric(m) ? null : m)), 280)
  }
  const hoverStay = () => hover.current && clearTimeout(hover.current)

  return (
    <header className="site-header" id="site-header" ref={ref} onPointerLeave={hoverLeave} onPointerEnter={hoverStay}>
      <div className="header-inner">
        <Link className="brand" href="/" aria-label="DALIL, Guide & Services, accueil">
          <span className="brand-mark" aria-hidden="true">
            D
          </span>
          <span className="brand-text">
            <span className="brand-word">DALIL</span>
            <span className="brand-tagline">Guide &amp; Services</span>
          </span>
        </Link>

        <nav className="primary-nav" aria-label="Navigation principale">
          {RUBRICS.map((r) => (
            <div className="menu-wrap" key={r.key}>
              <button
                className={`nav-more ${active === r.key ? 'is-current' : ''}`}
                type="button"
                data-menu-trigger={r.key}
                aria-expanded={menu === r.key}
                aria-controls={`mega-${r.key}`}
                onClick={() => setMenu(menu === r.key ? null : r.key)}
                onPointerEnter={(e) => hoverOpen(r.key, e)}
              >
                {r.label}
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="m4 6 4 4 4-4" />
                </svg>
              </button>
                <div key={r.key} id={`mega-${r.key}`} className="mega2" data-menu={r.key} hidden={menu !== r.key} role="region" aria-label={r.label}>
                  <div className="mega2-inner">
                    <ul className="mega2-grid">
                      {r.entries.map(([href, icon, title, sub]) => (
                        <li key={title}>
                          <Link className="mega2-entry" href={href} onClick={() => setMenu(null)}>
                            <span className="mega2-ico">
                              <NavIcon name={icon} />
                            </span>
                            <span className="mega2-text">
                              <strong>
                                {title}
                                <svg viewBox="0 0 16 16" aria-hidden="true">
                                  <path d="m6 4 4 4-4 4" />
                                </svg>
                              </strong>
                              <small>{sub}</small>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <Feature rubric={r} slides={slides?.[r.key] ?? []} onGo={() => setMenu(null)} />
                  </div>
                  <div className="mega2-foot">
                    <QuickFind onDone={() => setMenu(null)} />
                    {r.extra && (
                      <Link className="mega2-extra" href={r.extra[0]} onClick={() => setMenu(null)}>
                        {r.extra[1]} →
                      </Link>
                    )}
                  </div>
                </div>
            </div>
          ))}
        </nav>

        <div className="header-actions">
          <WilayaPicker open={menu === 'wilaya'} onToggle={(o) => setMenu(o ? 'wilaya' : null)} />
          <div className="utility-wrap">
            <button className="icon-button flag-button" type="button" data-menu-trigger="language" aria-label="Changer de langue" aria-expanded={menu === 'language'} onClick={() => setMenu(menu === 'language' ? null : 'language')}>
              {current.flag}
            </button>
            <div className="utility-menu language-menu" data-menu="language" hidden={menu !== 'language'}>
              {LANGS.map((l) => (
                <Link key={l.code} href={l.href} role="button" data-language={l.code} onClick={() => chooseLang(l)}>
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
            <Link className="login-button" href={who}>
              Mon espace
            </Link>
          ) : (
            <Link className="login-button" href="/connexion">
              Connexion
            </Link>
          )}
          <Link className="icon-button account-button" href={who ?? '/connexion'} aria-label={who ? 'Mon espace' : 'Se connecter'}>
            <UserIcon />
          </Link>
          <button ref={burger} className="hamburger" type="button" aria-label={mobile ? 'Fermer la navigation' : 'Ouvrir la navigation'} aria-expanded={mobile} aria-controls="nav-sheet" onClick={() => setMobile(!mobile)}>
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>

      {mounted &&
        createPortal(
          <div id="nav-sheet" className={`nav-sheet ${mobile ? 'is-open' : ''}`} aria-hidden={!mobile} inert={!mobile}>
            {/* Toucher, faire défiler ou glisser hors du panneau ferme le menu. */}
            <div className="nav-sheet-backdrop" onClick={close} onWheel={close} onTouchMove={close} />
            <div className="nav-sheet-panel" role="dialog" aria-modal="true" aria-label="Menu" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
              <div className="nav-sheet-top">
                <Link className="nav-sheet-brand" href="/" onClick={close} aria-label="DALIL, accueil">
                  <span className="brand-mark" aria-hidden="true">
                    D
                  </span>
                  <b>DALIL</b>
                </Link>
                <Link className="nav-sheet-round" href={who ?? '/connexion'} onClick={close} aria-label={who ? 'Mon espace' : 'Mon compte'}>
                  <UserIcon />
                </Link>
                <button ref={closeBtn} className="nav-sheet-close" type="button" aria-label="Fermer le menu" onClick={close}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>

              <div className="nav-sheet-tools">
                <form className="nav-sheet-search" action="/recherche" role="search" onSubmit={close}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-4-4" />
                  </svg>
                  <label className="sr-only" htmlFor="nav-sheet-q">
                    Rechercher sur DALIL
                  </label>
                  <input id="nav-sheet-q" name="q" type="search" placeholder="Rechercher sur DALIL" enterKeyHint="search" autoComplete="off" />
                </form>
                <WilayaPicker inline open={mobile && menu === 'wilaya'} onToggle={(o) => setMenu(o ? 'wilaya' : null)} />
              </div>

              <nav className="nav-sheet-list" aria-label="Rubriques">
                {RUBRICS.map((r) => {
                  const v = SHEET[r.key]
                  const open = drawer === r.key
                  return (
                    <div className={`nav-sheet-rubric ${active === r.key ? 'is-current' : ''}`} key={r.key}>
                      <button type="button" className="nav-sheet-row" aria-expanded={open} aria-controls={`sheet-${r.key}`} onClick={() => setDrawer(open ? null : r.key)}>
                        <span className="nav-sheet-dot" style={{ background: v.color, color: v.ink ?? '#fff' }}>
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d={v.icon} />
                          </svg>
                        </span>
                        <span className="nav-sheet-txt">
                          <b>{v.label ?? r.label}</b>
                          <small>{v.hint}</small>
                        </span>
                        <svg className="nav-sheet-chev" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>
                      <div id={`sheet-${r.key}`} className="nav-sheet-sub" hidden={!open}>
                        {r.entries.map(([href, , title]) => (
                          <Link key={title} href={href} onClick={close}>
                            {title}
                            <span aria-hidden="true">›</span>
                          </Link>
                        ))}
                        {r.href && (
                          <Link className="nav-sheet-all" href={r.href} onClick={close}>
                            Toute la rubrique
                            <span aria-hidden="true">›</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  )
                })}
              </nav>

              <section className="nav-sheet-account" aria-label="Mon compte">
                <b>Mon compte DALIL</b>
                {who ? (
                  <Link className="nav-sheet-primary" href={who} onClick={close}>
                    Mon espace
                  </Link>
                ) : (
                  <>
                    <Link className="nav-sheet-primary" href="/connexion" onClick={close}>
                      Se connecter
                    </Link>
                    <Link className="nav-sheet-secondary" href="/connexion/particulier?tab=signup" onClick={close}>
                      Créer un compte gratuit
                    </Link>
                    <Link className="nav-sheet-pro" href="/connexion/professionnel" onClick={close}>
                      Vous êtes professionnel ? <span>Espace pro ›</span>
                    </Link>
                  </>
                )}
              </section>

              <div className="nav-sheet-foot">
                <div className="nav-sheet-seg" role="group" aria-label="Langue">
                  {LANGS.map((l) => (
                    <Link key={l.code} href={l.href} className={l.code === lang ? 'is-on' : ''} aria-current={l.code === lang ? 'true' : undefined} aria-label={l.label} title={l.label} onClick={() => chooseLang(l)}>
                      <span aria-hidden="true">{l.flag}</span>
                    </Link>
                  ))}
                </div>
                <div className="nav-sheet-seg" role="group" aria-label="Apparence">
                  <button type="button" className={theme === 'light' ? 'is-on' : ''} aria-pressed={theme === 'light'} aria-label="Mode clair" title="Mode clair" onClick={() => applyTheme('light')}>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="12" cy="12" r="4" />
                      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                    </svg>
                  </button>
                  <button type="button" className={theme === 'dark' ? 'is-on' : ''} aria-pressed={theme === 'dark'} aria-label="Mode sombre" title="Mode sombre" onClick={() => applyTheme('dark')}>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </header>
  )
}

/** Carte « à la une » du méga-menu : photo d’une fiche DALIL, lieu, titre, flèche ; points pour changer de photo (jamais automatique). */
function Feature({ rubric, slides, onGo }: { rubric: Rubric; slides: Slide[]; onGo: () => void }) {
  const [i, setI] = useState(0)
  const s = slides[i] ?? slides[0]
  const href = rubric.key === 'decouvrir' && s ? s.href : rubric.feature.href
  return (
    <div className={`mega2-feature ${s ? '' : 'no-photo'}`} style={s ? { backgroundImage: `url(${s.photo})` } : undefined}>
      <div className="mega2-feature-copy">
        {(s?.place || rubric.feature.kicker) && (
          <span className="mega2-place">
            <NavIcon name="pin" />
            {rubric.key === 'decouvrir' || rubric.key === 'musulmane' || rubric.key === 'vivre' ? (s?.place ?? rubric.feature.kicker) : rubric.feature.kicker}
          </span>
        )}
        <Link className="mega2-feature-link" href={href} onClick={onGo}>
          <strong>{rubric.feature.title}</strong>
        </Link>
        {slides.length > 1 && (
          <div className="mega2-dots" role="group" aria-label="Photos à la une">
            {slides.map((x, k) => (
              <button key={x.href + k} type="button" aria-label={`Photo ${k + 1} sur ${slides.length} : ${x.place}`} aria-pressed={k === i} onClick={() => setI(k)} />
            ))}
          </div>
        )}
      </div>
      <span className="mega2-arrow" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>
      {s?.credit && <small className="mega2-credit">{s.credit}</small>}
    </div>
  )
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </svg>
  )
}
