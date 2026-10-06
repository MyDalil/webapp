'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export function openLogin() {
  window.dispatchEvent(new Event('dalil:login'))
}

/**
 * Fenêtre « Connexion » de la maquette. L’accès gratuit repose sur le profil test
 * (pseudonyme, 7 jours, sans email ni mot de passe) — comme dans le prototype.
 */
export function LoginDialog() {
  const ref = useRef<HTMLDialogElement>(null)
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [nick, setNick] = useState<string | null>(null)

  useEffect(() => {
    const open = () => {
      fetch('/api/test-session')
        .then((r) => r.json())
        .then((s) => setNick(s.profile?.nickname ?? null))
        .catch(() => {})
      ref.current?.showModal()
    }
    window.addEventListener('dalil:login', open)
    return () => window.removeEventListener('dalil:login', open)
  }, [])

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const nickname = String(new FormData(e.currentTarget).get('nickname') || '').trim()
    if (!nickname) return
    setBusy(true)
    setErr('')
    try {
      const r = await fetch('/api/test-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'profile', profile: { nickname, role: 'member' } }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Réessayez.')
      ref.current?.close()
      router.push('/test')
    } catch (er) {
      setErr((er as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <dialog
      className="login-dialog"
      ref={ref}
      onClick={(e) => {
        const r = ref.current!.getBoundingClientRect()
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) ref.current?.close()
      }}
    >
      <button className="dialog-close" type="button" aria-label="Fermer" onClick={() => ref.current?.close()}>
        ×
      </button>
      <div className="dialog-brand">
        <span className="brand-mark">D</span>
        <strong>DALIL</strong>
      </div>
      <p className="eyebrow">Votre espace personnel</p>
      <h2>{nick ? `Bon retour, ${nick}.` : 'Retrouvez ce qui compte pour vous.'}</h2>
      <p>Enregistrez vos adresses, suivez vos démarches et retrouvez vos contributions.</p>
      {nick ? (
        <button
          className="button primary wide"
          type="button"
          onClick={() => {
            ref.current?.close()
            router.push('/test')
          }}
        >
          Ouvrir mon espace
        </button>
      ) : (
        <form onSubmit={submit}>
          <label htmlFor="login-nickname">Pseudonyme</label>
          <input id="login-nickname" name="nickname" placeholder="Ex. Amina" maxLength={40} autoComplete="nickname" required />
          <button className="button primary wide" type="submit" disabled={busy}>
            {busy ? 'Création…' : 'Créer mon accès gratuit'}
          </button>
          <small className="login-note">Sans email ni mot de passe. Votre espace reste sur ce navigateur pendant 7 jours.</small>
          {err && <small className="form-error">{err}</small>}
        </form>
      )}
      <button className="text-button" type="button" onClick={() => ref.current?.close()}>
        Continuer sans compte
      </button>
    </dialog>
  )
}
