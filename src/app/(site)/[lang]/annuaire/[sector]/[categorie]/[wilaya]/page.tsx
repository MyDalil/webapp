import { isLang } from '@/platform/i18n'
import type { Metadata } from 'next'
import { searchPlaces } from '@/modules/annuaire'
import { SITE } from '@/platform/mail'
import { categoryBySlug, categoryPath, wilayaBySlug } from '@/platform/referentiel/slug'
import { CategoryPage } from '../CategoryPage'

type Props = { params: Promise<{ sector: string; categorie: string; wilaya: string; lang: string }> }
export const revalidate = 3600
// Sans generateStaticParams, Next 16 recalcule la page à chaque visite malgré `revalidate`.
// Liste vide : aucune page au build, chacune mise en cache (ISR) à sa première visite.
export const generateStaticParams = async () => []

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sector, categorie, wilaya } = await params
  const f = categoryBySlug(sector, categorie)
  const w = wilayaBySlug(wilaya)
  if (!f || !w) return {}
  // Une combinaison sans adresse reste utile au visiteur mais n’est pas proposée aux moteurs (contenu non spécifique).
  const { total } = await searchPlaces({ sector: f.sector.slug, category: f.category, wilaya: String(w.code) }, 1)
  return {
    title: `${f.category} à ${w.name} — ${f.sector.title}`,
    description: `${f.category} dans la wilaya de ${w.name} : adresses, contacts et statut de vérification DALIL.`,
    alternates: { canonical: `${SITE}${categoryPath(f.sector.slug, f.category, w.code)}` },
    robots: total ? undefined : { index: false, follow: true },
  }
}

export default async function Page({ params }: Props) {
  const { lang, sector, categorie, wilaya } = await params
  return <CategoryPage lang={isLang(lang) ? lang : 'fr'} sector={sector} categorie={categorie} wilaya={wilaya} />
}
