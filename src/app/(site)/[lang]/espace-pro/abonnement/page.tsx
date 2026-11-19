import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from '@/platform/ui/Link'
import { currentMember } from '@/modules/membres'
import { myTargets, readPricing } from '@/modules/pros'
import { freeMonths, PlanPicker, proText as t } from '@/modules/pros/ui'
import { isLang } from '@/platform/i18n'

export const metadata: Metadata = { title: 'Abonnement', robots: { index: false } }
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<{ fiche?: string }> }

/** Choix de la formule : plans lus dans les tarifs saisis par l’équipe ; aucun prix inventé. */
export default async function Abonnement({ params, searchParams }: Props) {
  const { lang: l } = await params
  const lang = isLang(l) ? l : 'fr'
  const fiche = (await searchParams).fiche
  const m = await currentMember()
  if (!m) redirect(`/connexion/professionnel?next=${encodeURIComponent(`/espace-pro/abonnement${fiche ? `?fiche=${fiche}` : ''}`)}`)
  const [targets, pricing] = await Promise.all([m._verified ? myTargets(m) : [], readPricing()])
  return (
    <section className="auth-page container account-page">
      <p className="eyebrow">{t('Espace professionnel', lang)}</p>
      <h1>{t('Votre formule.', lang)}</h1>
      {!m._verified ? (
        <p className="auth-msg error">Confirmez votre adresse email ({m.email}) pour activer votre espace professionnel.</p>
      ) : targets.length ? (
        <PlanPicker targets={targets.map(({ collection, id, name }) => ({ collection, id, name }))} pricing={pricing} free={freeMonths(pricing)} initialTarget={fiche} />
      ) : (
        <>
          <p className="muted-line">{t('Aucune fiche rattachée à votre compte : inscrivez ou revendiquez d’abord votre activité.', lang)}</p>
          <div className="button-row">
            <Link className="button primary" href="/inscrire">
              {t('Inscrire mon activité', lang)}
            </Link>
          </div>
        </>
      )}
    </section>
  )
}
