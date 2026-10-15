import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { currentMember } from '@/modules/sante'
import { ProSpace } from '@/modules/sante/ui'
import { WILAYAS } from '@/platform/referentiel/catalog'

export const metadata: Metadata = { title: 'Espace pro · DALIL', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function ProPage() {
  const m = await currentMember()
  if (!m) redirect('/connexion/professionnel?next=/espace-pro')
  return (
    <section className="auth-page container account-page">
      <p className="eyebrow">Espace professionnel</p>
      <h1>Votre agenda et votre fiche.</h1>
      {!m._verified ? (
        <p className="auth-msg error">Confirmez votre adresse email ({m.email}) pour activer votre espace professionnel.</p>
      ) : (
        <ProSpace wilayas={WILAYAS.filter((w) => !w.transition).map(({ code, name }) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name, 'fr'))} />
      )}
    </section>
  )
}
