import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from '@/platform/ui/Link'
import { algiersLongDate, algiersTime, currentMember, videoAccess } from '@/modules/sante'
import { VideoRoom } from '@/modules/sante/ui'

export const metadata: Metadata = { title: 'Consultation en visio', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

const MESSAGES = {
  closed: 'Cette salle est fermée : l’heure de la consultation est passée.',
  cancelled: 'Ce rendez-vous a été annulé.',
  forbidden: 'Cette salle est réservée au patient et au praticien du rendez-vous. Connectez-vous avec le bon compte.',
  missing: 'Rendez-vous en visio introuvable.',
  disabled: 'La visio n’est pas disponible pour le moment. Contactez le cabinet.',
} as const

export default async function VisioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const m = await currentMember()
  if (!m) redirect(`/connexion/particulier?next=${encodeURIComponent(`/visio/${id}`)}`)
  const access = await videoAccess(Number(id), m)
  const back = m.kind === 'pro' ? '/espace-pro?espace=praticien' : '/mon-compte'
  if (access.state === 'open') return (
    <section className="container visio-page">
      <VideoRoom token={access.token} serverUrl={access.serverUrl} title={access.title} demo={access.demo} backHref={back} />
    </section>
  )
  return (
    <section className="auth-page container account-page">
      <p className="eyebrow">Consultation en visio</p>
      {access.state === 'early' ? (
        <>
          <h1>{access.title}</h1>
          <p>
            La salle ouvre le {algiersLongDate(new Date(access.opensAt).toISOString())} à {algiersTime(new Date(access.opensAt).toISOString())} (heure d’Alger), 15 minutes avant
            le rendez-vous. Revenez sur ce lien à ce moment-là.
          </p>
          <p className="muted-line">Avant la consultation : autorisez la caméra et le micro dans votre navigateur. Aucune application à installer.</p>
        </>
      ) : (
        <h1>{MESSAGES[access.state]}</h1>
      )}
      <p>
        <Link className="button outline" href={back}>
          Retour à mes rendez-vous
        </Link>
      </p>
    </section>
  )
}
