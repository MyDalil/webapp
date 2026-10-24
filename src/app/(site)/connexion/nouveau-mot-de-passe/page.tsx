import { ResetPassword } from '@/modules/membres/ui'

export const dynamic = 'force-dynamic'

export default async function Reset({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await searchParams
  return (
    <section className="auth-page auth-narrow container">
      <p className="eyebrow">Mot de passe</p>
      <h1>Choisissez un nouveau mot de passe.</h1>
      <ResetPassword token={token} />
    </section>
  )
}
