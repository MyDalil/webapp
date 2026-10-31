import type { Metadata } from 'next'
import { categoryBySlug, categoryPath } from '@/platform/referentiel/slug'
import { SITE } from '@/platform/mail'
import { CategoryPage } from './CategoryPage'

type Props = { params: Promise<{ sector: string; categorie: string }> }
export const revalidate = 3600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sector, categorie } = await params
  const f = categoryBySlug(sector, categorie)
  if (!f) return {}
  return {
    title: `${f.category} en Algérie — ${f.sector.title} · DALIL`,
    description: `${f.category} dans toutes les wilayas d’Algérie : adresses, contacts et statut de vérification DALIL.`,
    alternates: { canonical: `${SITE}${categoryPath(f.sector.slug, f.category)}` },
  }
}

export default async function Page({ params }: Props) {
  const { sector, categorie } = await params
  return <CategoryPage sector={sector} categorie={categorie} />
}
