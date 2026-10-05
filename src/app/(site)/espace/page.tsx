import type { Metadata } from 'next'
import { MemberSpace } from '@/components/MemberSpace'
import { Legacy } from '@/components/Legacy'

export const metadata: Metadata = { title: 'Espace Particulier', robots: { index: false } }

export default function EspacePage() {
  return <MemberSpace guest={<Legacy route="/espace" />} />
}
