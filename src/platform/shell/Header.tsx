'use client'

import { useEffect, useRef, useState } from 'react'
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
      if (window.matchMedia('(max-width: 1100px)').matches) setMobile(true)
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

  const toggleTheme = () => {
    const html = document.documentElement
    const next = html.dataset.theme === 'dark' ? 'light' : 'dark'
    html.dataset.theme = next
    html.classList.toggle('dark', next === 'dark')
    try {
      localStorage.setItem('dalil-theme', next)
    } catch {}
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
                <Link key={l.code} href={l.href} role="button" data-language={l.code} onClick={() => {
                    // Langue retenue aussi pour les noms des cartes (annuaire › DirectoryMap).
                    try {
                      localStorage.setItem('dalil-map-lang', l.code)
                    } catch {}
                    if (l.code !== 'fr') toast(`${l.label} — version en préparation`)
                  }}>
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
          <button className="hamburger" type="button" aria-label={mobile ? 'Fermer la navigation' : 'Ouvrir la navigation'} aria-expanded={mobile} onClick={() => setMobile(!mobile)}>
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>

      <div className="mobile-menu" hidden={!mobile}>
        <WilayaPicker inline open={menu === 'wilaya'} onToggle={(o) => setMenu(o ? 'wilaya' : null)} />
        {RUBRICS.map((r) => (
          <div className="drawer-rubric" key={r.key}>
            <button type="button" className="drawer-head" aria-expanded={drawer === r.key} aria-controls={`drawer-${r.key}`} onClick={() => setDrawer(drawer === r.key ? null : r.key)}>
              {r.label}
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="m4 6 4 4 4-4" />
              </svg>
            </button>
            <div id={`drawer-${r.key}`} className="drawer-body" hidden={drawer !== r.key}>
              {r.entries.map(([href, icon, title]) => (
                <Link key={title} href={href}>
                  <span className="mega2-ico">
                    <NavIcon name={icon} />
                  </span>
                  {title}
                </Link>
              ))}
              {r.href && (
                <Link className="drawer-all" href={r.href}>
                  Toute la rubrique {r.label} →
                </Link>
              )}
              {r.extra && <Link href={r.extra[0]}>{r.extra[1]}</Link>}
            </div>
          </div>
        ))}
        <div className="mobile-spaces">
          <Link href="/connexion/particulier">Espace Particulier</Link>
          <Link href="/connexion/professionnel">Espace Professionnel</Link>
        </div>
      </div>
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
