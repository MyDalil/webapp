import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { hubByRoute } from '@/modules/contenus'
import { HubView } from '@/modules/contenus/ui'
import { withSectionGate } from '@/platform/ui/SectionGate'

const hub = hubByRoute('/business-emploi')

export const metadata: Metadata = hub ? { title: `${hub.eyebrow}`, description: hub.lead } : {}

function Page() {
  if (!hub) notFound()
  return <HubView hub={hub} />
}

export default withSectionGate(Page, () => '/business-emploi')
