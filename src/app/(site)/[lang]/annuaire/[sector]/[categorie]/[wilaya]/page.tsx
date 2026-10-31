import type { Metadata } from 'next'
import { searchPlaces } from '@/modules/annuaire'
import { SITE } from '@/platform/mail'
import { categoryBySlug, categoryPath, wilayaBySlug } from '@/platform/referentiel/slug'
import { CategoryPage } from '../CategoryPage'

type Props = { params: Promise<{ sector: string; categorie: string; wilaya: string }> }
export const revalidate = 3600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sector, categorie, wilaya } = await params
  const f = categoryBySlug(sector, categorie)
  const w = wilayaBySlug(wilaya)
  if (!f || !w) return {}
  // Une combinaison sans adresse reste utile au visiteur mais n’est pas proposée aux moteurs (contenu non spécifique).
  const { total } = await searchPlaces({ sector: f.sector.slug, category: f.category, wilaya: String(w.code) }, 1)
  return {
    title: `${f.category} à ${w.name} — ${f.sector.title} · DALIL`,
    description: `${f.category} dans la wilaya de ${w.name} : adresses, contacts et statut de vérification DALIL.`,
    alternates: { canonical: `${SITE}${categoryPath(f.sector.slug, f.category, w.code)}` },
    robots: total ? undefined : { index: false, follow: true },
  }
}

export default async function Page({ params }: Props) {
  const { sector, categorie, wilaya } = await params
  return <CategoryPage sector={sector} categorie={categorie} wilaya={wilaya} />
}
