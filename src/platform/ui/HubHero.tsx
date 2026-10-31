import type { ReactNode } from 'react'

/**
 * En-tête des pages de rubrique (Vie musulmane, Démarches…) : photo réelle créditée, titre et texte mesurés,
 * actions en dessous. Même présentation partout (demande de Rad, 2026-10-27).
 */
export function HubHero({ eyebrow, title, lead, photo, credit, children }: { eyebrow: string; title: ReactNode; lead: string; photo?: string | null; credit?: string | null; children?: ReactNode }) {
  return (
    <section className="hub-hero">
      {photo && <div className="hub-hero-img" style={{ backgroundImage: `url(${photo})` }} />}
      <div className="hub-hero-shade" />
      <div className="hub-hero-content">
        <p className="hub-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="hub-lead">{lead}</p>
        {children && <div className="hub-actions">{children}</div>}
      </div>
      {photo && credit && <small className="hub-credit">{credit}</small>}
    </section>
  )
}
