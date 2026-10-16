import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { currentMember, getMission } from '@/modules/services'
import { MissionThread } from '@/modules/services/ui'

export const metadata: Metadata = { title: 'Mission · DALIL', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function MissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const m = await currentMember()
  if (!m) redirect(`/connexion/particulier?next=/missions/${id}`)
  const mission = await getMission(m, Number(id))
  if ('error' in mission) notFound()
  return (
    <section className="auth-page container account-page mission-page">
      <Link className="back-link" href={mission.role === 'client' ? '/mon-compte' : '/espace-pro?espace=services'}>
        ← {mission.role === 'client' ? 'Mon compte' : 'Mon espace pro'}
      </Link>
      <MissionThread initial={mission} />
    </section>
  )
}
