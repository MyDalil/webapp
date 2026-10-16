import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { currentMember } from '@/modules/sante'
import { MyAppointments } from '@/modules/sante/ui'
import { AccountActions } from '@/modules/membres/ui'
import { MyMissions } from '@/modules/services/ui'

export const metadata: Metadata = { title: 'Mon compte · DALIL', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function Account() {
  const m = await currentMember()
  if (!m) redirect('/connexion/particulier?next=/mon-compte')
  return (
    <section className="auth-page container account-page">
      <p className="eyebrow">Mon compte</p>
      <h1>Bonjour {m.firstName}.</h1>
      {!m._verified && <p className="auth-msg error">Confirmez votre adresse email pour pouvoir réserver ou envoyer une demande : le lien vous a été envoyé à {m.email}.</p>}
      <div className="account-shortcuts">
        <Link className="button primary" href="/praticiens">
          Prendre un rendez-vous
        </Link>
        <Link className="button primary" href="/services">
          Trouver un prestataire
        </Link>
        <Link className="button outline" href="/espace-pro">
          {m.kind === 'pro' ? 'Mon espace pro' : 'Activer mon espace pro'}
        </Link>
      </div>
      <MyAppointments />
      <MyMissions />
      <section className="account-block">
        <h2>Mes informations</h2>
        <p>
          {m.firstName} {m.lastName} · {m.email} · {m.phone}
        </p>
        <AccountActions />
      </section>
    </section>
  )
}
