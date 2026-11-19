import { isLang } from '@/platform/i18n'
import { galleryOf, getPlace, wilayaName } from '@/modules/annuaire'
import { latinCity } from '@/platform/referentiel/communes'
import { OG_CONTENT_TYPE, OG_SIZE, ficheOgImage } from '@/platform/seo/ogImage'

export const alt = 'Fiche DALIL'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
// Aucune image au build (des centaines de fiches) : chacune est calculée à la première demande puis mise en cache.
export const generateStaticParams = async () => []
export const revalidate = 86400

/** Aperçu de lien d’une adresse : photo du lieu (sinon aucune), nom, catégorie, commune et wilaya. */
export default async function Image({ params }: { params: Promise<{ slug: string; lang: string }> }) {
  const { slug, lang } = await params
  const p = await getPlace(slug, isLang(lang) ? lang : undefined)
  if (!p) return ficheOgImage({ title: 'DALIL — Guide de l’Algérie' })
  const wilaya = p.wilaya ? wilayaName(p.wilaya) : null
  const city = latinCity(p.city)
  return ficheOgImage({
    title: p.name,
    kicker: p.category,
    place: [city, wilaya && wilaya !== city ? `wilaya de ${wilaya}` : null].filter(Boolean).join(', '),
    photo: galleryOf(p)[0]?.url ?? null,
    rtl: lang === 'ar',
  })
}
