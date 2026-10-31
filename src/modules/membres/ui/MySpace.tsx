'use client'

import Link from '@/platform/ui/Link'
import { useState, type FormEvent } from 'react'
import { toast } from '@/platform/shell/toast'

type Fav = { id: number; itemType: string; itemKey: string; label: string; path: string }
export type SpaceView = {
  profile: { territory: string; interest: string }
  favorites: Fav[]
  collections: { id: number; name: string }[]
  items: { collectionId: number; favoriteId: number }[]
  routes: number
  applications: number
}

/** Mon compte : profil (ville, intérêts), parcours, favoris et listes — repris de l’espace du prototype, rattachés au compte. */
export function MySpace({ initial }: { initial: SpaceView }) {
  const [profile, setProfile] = useState(initial.profile)
  const [favorites, setFavorites] = useState(initial.favorites)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const next = { territory: String(fd.get('territory') ?? ''), interest: String(fd.get('interest') ?? '') }
    setBusy(true)
    const r = await fetch('/api/test-session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'profile', profile: next }) })
    setBusy(false)
    if (!r.ok) return setMsg('Enregistrement impossible, réessayez.')
    setProfile(next)
    setMsg('')
    toast('Profil enregistré')
  }

  async function remove(f: Fav) {
    const r = await fetch('/api/favorites', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ itemType: f.itemType, itemKey: f.itemKey }) })
    if (!r.ok) return toast('Suppression impossible, réessayez')
    setFavorites(favorites.filter((x) => x.id !== f.id))
    toast('Retiré de vos favoris')
  }

  return (
    <>
      <section className="account-block" id="profil">
        <h2>Mon profil</h2>
        <form className="space-profile" onSubmit={saveProfile}>
          <label>
            Ville ou wilaya · facultatif
            <input name="territory" maxLength={80} defaultValue={profile.territory} />
          </label>
          <label>
            Ce qui m’intéresse · facultatif
            <input name="interest" maxLength={160} defaultValue={profile.interest} placeholder="Sorties, écoles, installation…" />
          </label>
          <button className="button outline" disabled={busy}>
            {busy ? 'Enregistrement…' : 'Enregistrer mon profil'}
          </button>
        </form>
        {msg && <p className="auth-msg error">{msg}</p>}
        <div className="next-action space-next">
          <span>Prochaine étape</span>
          <strong>{initial.routes ? 'Lire les guides recommandés' : 'Construire mon parcours personnalisé'}</strong>
          <Link className="button text" href={initial.routes ? '/guides' : '/diagnostic'}>
            Continuer →
          </Link>
        </div>
      </section>

      <section className="account-block" id="favoris">
        <h2>Mes favoris</h2>
        {favorites.length ? (
          <ul className="space-favorites">
            {favorites.map((f) => (
              <li key={f.id}>
                <Link href={f.path}>
                  <strong>{f.label || f.itemKey}</strong>
                  <small>{f.itemType === 'guide' ? 'Guide' : 'Adresse'}</small>
                </Link>
                <button className="button outline" type="button" onClick={() => void remove(f)}>
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted-line">
            Enregistrez un guide ou une adresse avec le bouton « Enregistrer » : vous les retrouverez ici. <Link href="/annuaire">Explorer l’annuaire</Link>
          </p>
        )}
        {initial.collections.length > 0 && (
          <div className="space-lists" id="listes">
            <h3>Mes listes</h3>
            {initial.collections.map((c) => (
              <p key={c.id}>
                <b>{c.name}</b> <small>{initial.items.filter((i) => i.collectionId === c.id).length} élément(s)</small>
              </p>
            ))}
          </div>
        )}
        {initial.applications > 0 && (
          <p className="muted-line">
            <Link href="/professionnels/espace">Suivre ma candidature</Link>
          </p>
        )}
      </section>
    </>
  )
}
