import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { hubByRoute } from '@/modules/contenus'
import { HubView } from '@/modules/contenus/ui'
import { withSectionGate } from '@/platform/ui/SectionGate'

const hub = hubByRoute('/vie-pratique')

export const metadata: Metadata = hub ? { title: `${hub.eyebrow}`, description: hub.lead } : {}

function Page() {
  if (!hub) notFound()
  return <HubView hub={hub} />
}

export default withSectionGate(Page, () => '/vie-pratique')
