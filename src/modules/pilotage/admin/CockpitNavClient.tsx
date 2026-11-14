'use client'
import { Hamburger, useNav } from '@payloadcms/ui'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { Icon } from './icons'
import type { NavItem } from './nav'

type Item = NavItem & { count: number; hot: boolean }
type Labels = { team: string; locked: string; killswitch: string; ksOff: string; ksOn: string; ksManage: string; logout: string; close: string }

/** Le menu garde la classe « nav » de Payload : largeur, tiroir mobile et repli restent gérés par Payload. */
export function CockpitNavClient({ groups, killSwitchOn, labels }: { groups: { key: string; label: string; items: Item[] }[]; killSwitchOn: boolean; labels: Labels }) {
  const { navOpen, navRef, setNavOpen, hydrated, shouldAnimate } = useNav()
  // Payload ferme le menu sur tout écran ≤ 1440 px ; le cockpit le garde ouvert sur ordinateur (> 1024 px).
  // Payload peut le refermer pendant qu’il mesure l’écran (jusqu’à ~1 s après le chargement) : on le rouvre dans cette fenêtre seulement.
  const mountedAt = useRef(0)
  useEffect(() => { mountedAt.current = Date.now() }, [])
  useEffect(() => {
    if (hydrated && !navOpen && Date.now() - mountedAt.current < 1500 && window.matchMedia('(min-width: 1025px)').matches) setNavOpen(true)
  }, [hydrated, navOpen, setNavOpen])
  const path = usePathname()
  const search = useSearchParams()?.toString() ?? ''
  const here = search ? `${path}?${search}` : path
  // L’entrée active est la plus précise qui correspond à l’adresse.
  const active = groups
    .flatMap((g) => g.items)
    .filter((i) => (i.href === '/admin' ? path === '/admin' : here === i.href || (!i.href.includes('?') && path.startsWith(i.href))))
    .sort((a, b) => b.href.length - a.href.length)[0]?.key

  const cls = ['nav', 'dl-nav', 'dl', navOpen && 'nav--nav-open', shouldAnimate && 'nav--nav-animate', hydrated && 'nav--nav-hydrated'].filter(Boolean).join(' ')
  return (
    <aside className={cls} inert={!navOpen ? true : undefined}>
      <div className="nav__scroll" ref={navRef}>
        <nav className="dl-nav__wrap" aria-label="Menu de l’admin">
          <div className="dl-row dl-sb">
            <Link href="/admin" className="dl-brand">
              <span className="dl-logo" aria-hidden="true">D</span>
              <span><b>DALIL</b><small>{labels.team}</small></span>
            </Link>
            <button type="button" className="dl-ib nav__mobile-close" onClick={() => setNavOpen(false)} aria-label={labels.close}>
              <Hamburger isActive />
            </button>
          </div>
          {groups.map((g) => (
            <div key={g.key} role="group" aria-labelledby={`dl-g-${g.key}`}>
              <div className="dl-grp" id={`dl-g-${g.key}`}>{g.label}</div>
              {g.items.map((i) => (
                <Link key={i.key} href={i.href} className="dl-nv" aria-current={active === i.key ? 'page' : undefined} prefetch={false}>
                  <Icon name={i.icon} />
                  <span>{i.label}</span>
                  {i.count > 0 && <span className={i.hot ? 'dl-bdg hot' : 'dl-bdg'}>{i.count}</span>}
                  {i.lockedForAgents && <Icon name="lock" className="dl-i dl-lk" label={labels.locked} />}
                </Link>
              ))}
            </div>
          ))}
          <div className="dl-nav__foot">
            <Link href="/admin/globals/controls" className="dl-card dl-row dl-sb" style={{ padding: 12, boxShadow: 'none', textDecoration: 'none' }} aria-label={labels.ksManage}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{labels.killswitch}</span>
              <span className={killSwitchOn ? 'dl-pill da' : 'dl-pill ok'}>{killSwitchOn ? labels.ksOn : labels.ksOff}</span>
            </Link>
            <a href="/admin/logout" className="dl-nv"><Icon name="logout" /><span>{labels.logout}</span></a>
          </div>
        </nav>
      </div>
    </aside>
  )
}
