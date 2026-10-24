import Link from 'next/link'
import { payload } from '@/platform/http'

export const dynamic = 'force-dynamic'

export default async function Verify({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  let ok = false
  if (token && /^[a-f0-9]{20,}$/i.test(token)) {
    const p = await payload()
    ok = await p.verifyEmail({ collection: 'members', token }).catch(() => false)
  }
  return (
    <section className="auth-page auth-narrow container">
      <p className="eyebrow">Confirmation</p>
      <h1>{ok ? 'Adresse confirmée.' : 'Lien invalide ou déjà utilisé.'}</h1>
      <p className="auth-lead">{ok ? 'Votre compte est actif : connectez-vous pour réserver vos rendez-vous.' : 'Si votre adresse est déjà confirmée, connectez-vous simplement.'}</p>
      <Link className="button primary" href="/connexion">
        Se connecter
      </Link>
    </section>
  )
}
