import { isLang } from '@/platform/i18n'
import { demarcheBySlug, procedureBySlug } from '@/modules/contenus'
import { OG_CONTENT_TYPE, OG_SIZE, ficheOgImage } from '@/platform/seo/ogImage'

export const alt = 'Démarche DALIL'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
// Aucune image au build (des centaines de fiches) : chacune est calculée à la première demande puis mise en cache.
export const generateStaticParams = async () => []
export const revalidate = 3600

/** Aperçu de lien d’une démarche : illustration de la fiche, titre, lieu de la démarche. */
export default async function Image({ params }: { params: Promise<{ slug: string; lang: string }> }) {
  const { slug, lang } = await params
  const d = demarcheBySlug(slug)
  if (d) return ficheOgImage({ title: d.title, kicker: 'Démarche', place: d.where, photo: d.image, rtl: lang === 'ar' })
  const p = await procedureBySlug(slug, isLang(lang) ? lang : undefined)
  return ficheOgImage({ title: p?.title ?? 'DALIL — Démarches', kicker: p ? 'Démarche officielle' : null, rtl: lang === 'ar' })
}
