import type { Metadata } from 'next'
import { MemberSpace } from '@/modules/membres/ui'
import { Legacy } from '@/modules/contenus/ui'

export const metadata: Metadata = { title: 'Espace Particulier', robots: { index: false } }

export default function EspacePage() {
  return <MemberSpace guest={<Legacy route="/espace" />} />
}
