'use client'

import { tr } from '@/platform/i18n'
import Link from '@/platform/ui/Link'
import { useLang } from '@/platform/ui/lang'

/** Textes de revendication passés par les pages (français validé) → anglais et arabe. Texte inconnu : affiché tel quel. */
const CLAIM_T: Record<string, { en: string; ar: string }> = {
  'Vous êtes ce professionnel ? Gérez cette fiche gratuitement': { en: 'Is this your business? Manage this listing for free', ar: 'هل أنت صاحب هذا النشاط؟ أدِر هذه البطاقة مجانًا' },
  'Vous êtes ce praticien ? Activez la prise de rendez-vous': { en: 'Are you this practitioner? Turn on online booking', ar: 'هل أنت هذا الممارس؟ فعّل حجز المواعيد' },
  'Vous êtes ce praticien ? Gérez cette fiche gratuitement': { en: 'Are you this practitioner? Manage this listing for free', ar: 'هل أنت هذا الممارس؟ أدِر هذه البطاقة مجانًا' },
  'Vous êtes ce prestataire ? Gérez cette fiche gratuitement': { en: 'Are you this provider? Manage this listing for free', ar: 'هل أنت مقدّم هذه الخدمة؟ أدِر هذه البطاقة مجانًا' },
}

/** Libellé de revendication dans la langue de la page (repli : français). */
export const claimLabel = (label: string, lang: 'fr' | 'en' | 'ar') => tr(label, CLAIM_T, lang)

/** « Vous êtes ce professionnel ? » : revendication gratuite, mène au parcours d’inscription pro existant. */
export function ClaimLink({ label, href = '/connexion/professionnel' }: { label: string; href?: string }) {
  const lang = useLang()
  return (
    <p className="pl-claim">
      <Link href={href}>
        {claimLabel(label, lang)} <span aria-hidden="true">›</span>
      </Link>
    </p>
  )
}
