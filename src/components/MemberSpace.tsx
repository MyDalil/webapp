'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Icon } from './Icon'

type Fav = { id: number; itemType: string; itemKey: string; label: string; path: string }
type Me = {
  profile: { nickname: string; role?: string; territory?: string; interest?: string }
  saved: Fav[]
  diagnostics: unknown[]
  applications: unknown[]
  contacts: unknown[]
}

const NAV: [string, string, string][] = [
  ['#tableau', 'Tableau de bord', 'grid'],
  ['#favoris', 'Mes favoris', 'heart'],
  ['/recherche', 'Mes recherches', 'search'],
  ['#listes', 'Mes listes', 'list'],
  ['/proposer', 'Mes contributions', 'upload'],
  ['/test', 'Mon profil test', 'file'],
]

/** Espace particulier au format de la maquette, alimenté par la session visiteur (Neon). */
export function MemberSpace({ guest }: { guest: ReactNode }) {
  const [me, setMe] = useState<Me | null | undefined>(undefined)
  const [lists, setLists] = useState<{ collections: { id: number; name: string }[]; items: { collectionId: number; favoriteId: number }[] }>({ collections: [], items: [] })

  useEffect(() => {
    fetch('/api/me')
      .then((r) => (r.ok ? r.json() : null))
      .then(setMe)
      .catch(() => setMe(null))
    fetch('/api/collections')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setLists(j))
      .catch(() => {})
  }, [])

  const name = me?.profile?.nickname
  return (
    <section className="account-shell container">
      <aside className="account-sidebar">
        <div className="account-person">
          <span>{name ? name[0].toUpperCase() : 'M'}</span>
          <div>
            <strong>{name ?? 'Mon espace'}</strong>
            <small>Compte particulier</small>
          </div>
        </div>
        <nav>
          {NAV.map(([href, label, icon], i) => (
            <Link key={href} href={href} className={i === 0 ? 'active' : undefined}>
              <Icon name={icon} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <Link className="account-settings" href="/test">
          <Icon name="grid" />
          <span>Paramètres</span>
        </Link>
      </aside>
      <div className="account-content" id="tableau">
        {me === undefined ? (
          <p>Chargement de votre espace…</p>
        ) : !me ? (
          guest
        ) : (
          <>
            <div className="account-heading">
              <div>
                <p className="eyebrow">Espace Particulier</p>
                <h1>Bonjour {name},</h1>
                <p>Tout ce que vous avez choisi, au même endroit.</p>
              </div>
              <Link className="button primary" href="/explorer">
                Continuer à explorer
              </Link>
            </div>
            <div className="metric-grid member-metrics">
              {(
                [
                  ['heart', me.saved.length, 'Favoris'],
                  ['list', lists.collections.length, 'Listes'],
                  ['search', me.diagnostics.length, 'Parcours'],
                  ['upload', me.contacts.length + me.applications.length, 'Demandes'],
                ] as const
              ).map(([i, n, l]) => (
                <div className="metric-card" key={l}>
                  <span>
                    <Icon name={i} />
                  </span>
                  <strong>{n}</strong>
                  <small>{l}</small>
                </div>
              ))}
            </div>
            <div className="dashboard-grid">
              <section className="panel progress-panel">
                <div className="panel-title">
                  <div>
                    <p className="eyebrow">Votre parcours</p>
                    <h2>{me.profile.interest || 'Installation et vie quotidienne'}</h2>
                  </div>
                </div>
                <div className="next-action">
                  <span>Prochaine étape</span>
                  <strong>{me.diagnostics.length ? 'Lire les guides recommandés' : 'Construire mon parcours personnalisé'}</strong>
                  <Link className="button text" href={me.diagnostics.length ? '/guides' : '/diagnostic'}>
                    Continuer <Icon name="arrow" />
                  </Link>
                </div>
              </section>
              <section className="panel" id="listes">
                <div className="panel-title">
                  <div>
                    <p className="eyebrow">Mes listes</p>
                    <h2>{lists.collections.length ? `${lists.collections.length} liste${lists.collections.length > 1 ? 's' : ''}` : 'Aucune liste'}</h2>
                  </div>
                </div>
                <div className="activity-list">
                  {lists.collections.length ? (
                    lists.collections.map((c) => (
                      <p key={c.id}>
                        <span className="activity-icon">
                          <Icon name="list" />
                        </span>
                        <b>{c.name}</b>
                        <small>{lists.items.filter((i) => i.collectionId === c.id).length} élément(s)</small>
                      </p>
                    ))
                  ) : (
                    <p>
                      <small>Classez vos favoris dans des listes depuis votre profil test.</small>
                    </p>
                  )}
                </div>
              </section>
            </div>
            <section className="panel saved-section" id="favoris">
              <div className="panel-title">
                <div>
                  <p className="eyebrow">Pour vous</p>
                  <h2>Adresses et guides enregistrés</h2>
                </div>
                <Link className="button text" href="/annuaire">
                  Explorer l’annuaire <Icon name="arrow" />
                </Link>
              </div>
              {me.saved.length ? (
                <div className="mini-place-grid">
                  {me.saved.map((f) => (
                    <Link key={f.id} href={f.path}>
                      <div className="place-thumb photo-algiers"></div>
                      <div>
                        <strong>{f.label || f.itemKey}</strong>
                        <small>{f.itemType === 'guide' ? 'Guide' : 'Adresse'}</small>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p>Enregistrez un guide ou une adresse avec le bouton « Enregistrer » : vous les retrouverez ici.</p>
              )}
            </section>
          </>
        )}
      </div>
    </section>
  )
}
