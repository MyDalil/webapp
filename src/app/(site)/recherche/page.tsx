import type { Metadata } from 'next'
import { getPage } from '@/content'
import { Tree } from '@/components/Tree'

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
