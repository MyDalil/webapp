import type { Metadata } from 'next'
import { hubByRoute } from '@/modules/contenus'
import { HubView } from '@/modules/contenus/ui'
import { Browse, type BrowseQuery } from './Browse'

export const metadata: Metadata = { title: 'Services · DALIL', description: 'Médecins, artisans, ménage, garde d’enfants, cours… Des professionnels vérifiés par DALIL, près de chez vous.' }
export const dynamic = 'force-dynamic'

/** Rubrique Services : page de rubrique (photos) ; la liste des prestataires seulement pour une recherche précise (wilaya, langue…). */
export default async function Services({ searchParams }: { searchParams: Promise<BrowseQuery> }) {
  const q = await searchParams
  const hub = hubByRoute('/services')
  if (hub && !Object.values(q).some(Boolean)) return <HubView hub={hub} />
  return <Browse q={q} />
}
