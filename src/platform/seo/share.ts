/** Partage et contact « zéro friction » des fiches : fonctions pures (testées), utilisées par la barre d’actions. */

import type { Lang } from '@/platform/i18n'

/** Message pré-rempli du partage par WhatsApp, dans la langue de la page (le nom n’est jamais traduit). */
export function shareMessage(name: string, url: string, lang: Lang = 'fr') {
  if (lang === 'en') return `Here is ${name} on DALIL: ${url}`
  if (lang === 'ar') return `إليك ${name} على دليل: ${url}`
  return `Voici ${name} sur DALIL : ${url}`
}

/** Lien WhatsApp de partage (sans destinataire : l’utilisateur choisit le contact). */
export const whatsappShareUrl = (name: string, url: string, lang: Lang = 'fr') => `https://wa.me/?text=${encodeURIComponent(shareMessage(name, url, lang))}`

/** Libellés de la barre d’actions des fiches. */
export const ACTION_LABELS: Record<'share' | 'call' | 'whatsapp' | 'directions', Record<Lang, string>> = {
  share: { fr: 'Partager', en: 'Share', ar: 'مشاركة' },
  call: { fr: 'Appeler', en: 'Call', ar: 'اتصال' },
  whatsapp: { fr: 'WhatsApp', en: 'WhatsApp', ar: 'واتساب' },
  directions: { fr: 'Itinéraire', en: 'Directions', ar: 'الاتجاهات' },
}

/** Numéro algérien vers le format international attendu par wa.me (chiffres seuls, indicatif 213). */
export function waNumber(raw: string | null | undefined): string | null {
  if (!raw) return null
  let d = raw.replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.startsWith('0')) d = `213${d.slice(1)}`
  return d.length >= 9 ? d : null
}

export type ContactAction = { kind: 'call' | 'whatsapp' | 'directions'; label: string; href: string; external: boolean }

/**
 * Boutons de contact d’une fiche, seulement pour les champs renseignés :
 * Appeler (tel:), WhatsApp (numéro WhatsApp déclaré), Itinéraire (coordonnées connues).
 */
export function contactActions(f: { phone?: string | null; whatsapp?: string | null; directions?: string | null }, lang: Lang = 'fr'): ContactAction[] {
  const L = (k: keyof typeof ACTION_LABELS) => ACTION_LABELS[k][lang]
  const out: ContactAction[] = []
  const tel = f.phone?.replace(/[^\d+]/g, '')
  if (tel && tel.replace(/\D/g, '').length >= 6) out.push({ kind: 'call', label: L('call'), href: `tel:${tel}`, external: false })
  const wa = waNumber(f.whatsapp)
  if (wa) out.push({ kind: 'whatsapp', label: L('whatsapp'), href: `https://wa.me/${wa}`, external: true })
  if (f.directions) out.push({ kind: 'directions', label: L('directions'), href: f.directions, external: true })
  return out
}
