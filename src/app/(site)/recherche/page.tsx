import type { Metadata } from 'next'
import { getPage } from '@/modules/contenus'
import { Tree } from '@/modules/contenus/ui'

export const metadata: Metadata = { title: 'Que cherchez-vous en Algérie ?', robots: { index: false } }

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams
  const page = await getPage('/recherche')
  return (
    <div className="legacy">
      <Tree nodes={page?.content ?? []} overrides={{ GuidedSearch: { initialQuery: q.slice(0, 4000) } }} />
    </div>
  )
}
