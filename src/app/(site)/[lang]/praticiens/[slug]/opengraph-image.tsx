import { isLang } from '@/platform/i18n'
import { getPractitioner, specialtyLabel, toCard } from '@/modules/sante'
import { WILAYAS } from '@/platform/referentiel/catalog'
import { OG_CONTENT_TYPE, OG_SIZE, ficheOgImage } from '@/platform/seo/ogImage'

export const alt = 'Fiche praticien DALIL'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
// Aucune image au build (des centaines de fiches) : chacune est calculée à la première demande puis mise en cache.
export const generateStaticParams = async () => []
export const revalidate = 3600

/** Aperçu de lien d’un praticien : photo, nom, spécialité, ville et wilaya. */
export default async function Image({ params }: { params: Promise<{ slug: string; lang: string }> }) {
  const { slug, lang } = await params
  const p = await getPractitioner(slug, isLang(lang) ? lang : undefined)
  if (!p) return ficheOgImage({ title: 'DALIL — Guide de l’Algérie' })
  const wilaya = p.wilaya ? WILAYAS.find((w) => String(w.code) === p.wilaya)?.name : null
  return ficheOgImage({
    title: p.name,
    kicker: p.specialties?.[0] ? specialtyLabel(p.specialties[0]) : null,
    place: [p.city, wilaya && wilaya !== p.city ? `wilaya de ${wilaya}` : null].filter(Boolean).join(', '),
    photo: toCard(p).photo,
    rtl: lang === 'ar',
  })
}
