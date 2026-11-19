import Link from '@/platform/ui/Link'
import type { Lang3 } from '@/platform/controls/sections'

const T: Record<Lang3, { eyebrow: string; home: string }> = {
  fr: { eyebrow: 'Bientôt de retour', home: 'Retour à l’accueil' },
  en: { eyebrow: 'Back soon', home: 'Back to home' },
  ar: { eyebrow: 'نعود قريبًا', home: 'العودة إلى الصفحة الرئيسية' },
}

/**
 * Bloc public d’une rubrique ou catégorie coupée dans /admin/rubriques : même gabarit que la page introuvable
 * (mise en page, en-tête et recherche gardés), statut 200, `noindex` (balise remontée dans <head> par React).
 */
export function ComingSoon({ lang, message }: { lang: Lang3; message: string }) {
  const t = T[lang]
  return (
    <section className="page-intro container compact coming-soon" data-section-off="">
      <meta name="robots" content="noindex, follow" />
      <p className="eyebrow">{t.eyebrow}</p>
      <h1>{message}</h1>
      <div className="button-row">
        <Link className="button primary" href="/">
          {t.home}
        </Link>
      </div>
    </section>
  )
}
