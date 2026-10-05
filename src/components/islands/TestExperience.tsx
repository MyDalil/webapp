'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'

type Session = { profile: null | { nickname: string; role: string; territory: string; interest: string; businessName: string; tracking: boolean }; favorites: { path: string; label: string }[] }

export async function testAction(body: unknown) {
  const r = await fetch('/api/test-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const j = await r.json()
  if (!r.ok) throw new Error(j.error || 'Réessayez.')
  return j as Session
}

export function TestExperience({ onboarding = false }: { onboarding?: boolean | string }) {
  const [session, setSession] = useState<Session | null>(null)
  const [editing, setEditing] = useState(!!onboarding && onboarding !== 'false')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () =>
    fetch('/api/test-session')
      .then((r) => {
        if (!r.ok) throw new Error('Profil indisponible.')
        return r.json()
      })
      .then(setSession)
      .catch((e) => setError(e.message))

  useEffect(() => {
    load()
  }, [])

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    const fd = new FormData(e.currentTarget)
    try {
      await testAction({
        action: 'profile',
        profile: {
          nickname: fd.get('nickname'),
          role: fd.get('role'),
          territory: fd.get('territory'),
          interest: fd.get('interest'),
          businessName: fd.get('businessName'),
          tracking: fd.get('tracking') === 'on',
        },
      })
      window.location.assign('/test')
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  async function removeFavorite(path: string) {
    try {
      await testAction({ action: 'favorite', path, label: '', remove: true })
      await load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function wipe() {
    if (!window.confirm('Supprimer votre profil test, ses favoris et ses retours ?')) return
    setBusy(true)
    try {
      if (!(await fetch('/api/test-session', { method: 'DELETE' })).ok) throw new Error('Suppression impossible.')
      window.location.assign('/onboarding')
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  const p = session?.profile
  return (
    <section className="shell test-experience">
      <span className="section-label">DALIL · TEST GRATUIT</span>
      <h1>{p && !editing ? `Bienvenue, ${p.nickname}` : 'Votre Algérie, à votre rythme.'}</h1>
      {!session && !error ? (
        <p>Chargement du profil…</p>
      ) : !p || editing ? (
        <>
          <p>Un pseudonyme suffit. Aucun e-mail, code ou paiement. Votre profil reste accessible sur ce navigateur pendant sept jours ; il ne permet pas de vous identifier ni de récupérer un compte.</p>
          <form className="data-form" onSubmit={save}>
            <div className="form-grid">
              <label>
                Pseudonyme
                <input name="nickname" required maxLength={40} defaultValue={p?.nickname} autoComplete="off" />
              </label>
              <label>
                Je souhaite tester
                <select name="role" defaultValue={p?.role || 'member'}>
                  <option value="member">Mon espace particulier</option>
                  <option value="professional">Mon espace professionnel</option>
                </select>
              </label>
              <label>
                Ville ou wilaya · facultatif
                <input name="territory" maxLength={80} defaultValue={p?.territory} />
              </label>
              <label>
                Ce qui m’intéresse · facultatif
                <input name="interest" maxLength={160} defaultValue={p?.interest} placeholder="Sorties, écoles, installation…" />
              </label>
            </div>
            <label>
              Nom de l’activité testée · facultatif
              <input name="businessName" maxLength={120} defaultValue={p?.businessName} />
            </label>
            <label className="test-consent">
              <input name="tracking" type="checkbox" defaultChecked={p?.tracking || false} />
              <span>J’accepte de partager les pages visitées pendant ce test pour améliorer DALIL. Aucune saisie ni recherche détaillée n’est enregistrée. Décocher efface cet historique.</span>
            </label>
            <p>Utilisez un pseudonyme et évitez les informations sensibles. Les données restent dans le test jusqu’à votre suppression ou leur nettoyage par l’administrateur ; l’accès expire après sept jours.</p>
            <button className="green-button" disabled={busy}>
              {busy ? 'Création…' : p ? 'Enregistrer mon profil' : 'Créer mon profil gratuit'}
            </button>
            <Link className="outline-button" href="/">
              Passer et explorer
            </Link>
          </form>
        </>
      ) : (
        <>
          <p>
            {p.role === 'professional' ? 'Votre espace professionnel de test' : 'Votre espace personnel de test'} · Gratuit · {p.territory || 'Toute l’Algérie'}
          </p>
          <nav className="orientation-actions">
            <Link className="green-button" href="/explorer">
              Découvrir
            </Link>
            <Link href="/annuaire">Trouver une adresse</Link>
            <Link href="/guides">Lire les guides</Link>
            <button className="outline-button" onClick={() => setEditing(true)}>
              Modifier mon profil
            </button>
          </nav>
          <div className="test-grid">
            <section className="dashboard-card">
              <h2>Mes favoris</h2>
              {session?.favorites.length ? (
                session.favorites.map((f) => (
                  <div className="favorite-row" key={f.path}>
                    <Link href={f.path}>{f.label || f.path}</Link>
                    <button onClick={() => void removeFavorite(f.path)}>Retirer</button>
                  </div>
                ))
              ) : (
                <p>Enregistrez un guide ou une adresse avec le bouton « Enregistrer ». Vous les retrouverez ici.</p>
              )}
              <Link href="/guides">Choisir un guide</Link>
            </section>
            <section className="dashboard-card">
              <h2>{p.role === 'professional' ? 'Mon activité' : 'Mes envies et mon parcours'}</h2>
              <p>{p.role === 'professional' ? p.businessName || 'Votre activité reste à renseigner.' : p.interest || 'Ajoutez vos centres d’intérêt pour préparer votre visite.'}</p>
              <Link href="/installation">Préparer mon installation</Link>
              <p>
                <Link href="/demarches">Comprendre les démarches</Link>
              </p>
              {p.role === 'professional' && <p>Ce profil n’est pas une fiche publiée ni un label. Les échanges avec de vrais clients et la vérification professionnelle restent hors de ce test.</p>}
            </section>
          </div>
          <section className="dashboard-card">
            <h2>Votre retour, page par page</h2>
            <TestFeedback />
          </section>
          <p className="test-session-note">Suivi de navigation : {p.tracking ? 'activé avec votre accord' : 'désactivé'}. Aucun paiement pendant le test.</p>
          <button className="outline-button" onClick={() => void wipe()} disabled={busy}>
            Supprimer mon profil test
          </button>
        </>
      )}
      <p role="status">{error}</p>
    </section>
  )
}

function TestFeedback() {
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    setBusy(true)
    try {
      await testAction({ action: 'feedback', rating: fd.get('rating'), path: fd.get('path'), feedback: fd.get('feedback') })
      setMsg('Merci, votre retour est enregistré.')
      form.reset()
    } catch (err) {
      setMsg((err as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const pages: [string, string][] = [
    ['/', 'Accueil'],
    ['/onboarding', 'Création du profil'],
    ['/test', 'Mon espace'],
    ['/annuaire', 'Annuaire'],
    ['/guides', 'Guides'],
    ['/installation', 'Installation'],
    ['/demarches', 'Démarches'],
    ['/explorer', 'Découvrir'],
  ]
  return (
    <form className="data-form" onSubmit={submit}>
      <div className="form-grid">
        <label>
          Page concernée
          <select name="path">
            {pages.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          Facilité d’utilisation
          <select name="rating" defaultValue="" required>
            <option value="" disabled>
              Choisir une note
            </option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} / 5{n === 1 ? ' — difficile' : n === 5 ? ' — très simple' : ''}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Ce qui est clair, ce qui bloque, ce qui manque
        <textarea name="feedback" minLength={10} maxLength={1600} rows={4} required placeholder="Expliquez ce que vous vouliez faire et ce qui s’est passé, sans données personnelles." />
      </label>
      <button className="green-button" disabled={busy}>
        {busy ? 'Enregistrement…' : 'Envoyer mon retour'}
      </button>
      <p role="status">{msg}</p>
    </form>
  )
}
