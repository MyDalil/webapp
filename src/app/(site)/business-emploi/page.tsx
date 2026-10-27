import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { hubByRoute } from '@/modules/contenus'
import { HubView } from '@/modules/contenus/ui'

const hub = hubByRoute('/business-emploi')

export const metadata: Metadata = hub ? { title: `${hub.eyebrow} · DALIL`, description: hub.lead } : {}

export default function Page() {
  if (!hub) notFound()
  return <HubView hub={hub} />
}
