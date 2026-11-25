import { isLang } from '@/platform/i18n'
import { categoryLabel, getProvider, toCard } from '@/modules/services'
import { WILAYAS } from '@/platform/referentiel/catalog'
import { communeName } from '@/platform/referentiel/communes'
import { OG_CONTENT_TYPE, OG_SIZE, ficheOgImage } from '@/platform/seo/ogImage'

export const alt = 'Fiche prestataire DALIL'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
// Aucune image au build (des centaines de fiches) : chacune est calculée à la première demande puis mise en cache.
export const generateStaticParams = async () => []
export const revalidate = 604800 // 7 jours : la publication rafraîchit déjà la page à la demande (offre gratuite Vercel)

/** Aperçu de lien d’un prestataire : photo, nom, catégorie, commune de base et wilaya. */
export default async function Image({ params }: { params: Promise<{ slug: string; lang: string }> }) {
  const { slug, lang } = await params
  const p = await getProvider(slug, isLang(lang) ? lang : undefined)
  if (!p) return ficheOgImage({ title: 'DALIL — Guide de l’Algérie' })
  const wilaya = WILAYAS.find((w) => String(w.code) === p.wilaya)?.name
  const base = p.baseCommune ? communeName(p.baseCommune) : null
  return ficheOgImage({
    title: p.displayName,
    kicker: p.categories?.[0] ? categoryLabel(p.categories[0]) : null,
    place: [base, wilaya ? `wilaya de ${wilaya}` : null].filter(Boolean).join(', '),
    photo: toCard(p).photo,
    rtl: lang === 'ar',
  })
}
