import { isLang } from '@/platform/i18n'
import { categoryLabel, getClassified } from '@/modules/annonces'
import { OG_CONTENT_TYPE, OG_SIZE, ficheOgImage } from '@/platform/seo/ogImage'

export const alt = 'Annonce DALIL'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

/** Aperçu de lien d’une annonce publiée : photo, titre, prix et type, lieu. */
export default async function Image({ params }: { params: Promise<{ slug: string; lang: string }> }) {
  const { slug, lang } = await params
  const a = await getClassified(slug, isLang(lang) ? lang : undefined)
  if (!a || a.status !== 'published') return ficheOgImage({ title: 'DALIL — Annonces' })
  return ficheOgImage({
    title: a.title,
    kicker: [a.price, a.subLabel || categoryLabel(a.category)].filter(Boolean).join(' · '),
    place: a.place,
    photo: a.gallery[0]?.cover || a.photo,
    rtl: lang === 'ar',
  })
}
