import type { Metadata } from 'next'
import Link from '@/platform/ui/Link'
import { currentMember } from '@/modules/membres'
import { finalizeDraft, finalizeTarget } from '@/modules/pros'
import { proText as t } from '@/modules/pros/ui'
import { isLang } from '@/platform/i18n'

export const metadata: Metadata = { title: 'Finaliser votre fiche', robots: { index: false }, referrer: 'no-referrer' }
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<{ jeton?: string }> }

/**
 * Lien envoyé après la création d’un brouillon par le bot (lot J) : jeton vérifié, connexion ou inscription par code email,
 * revendication du brouillon par le membre (rattachement seulement à l’acceptation par l’équipe, « téléphone » si le numéro correspond), puis choix de la formule.
 */
export default async function Finaliser({ params, searchParams }: Props) {
  const { lang: l } = await params
  const lang = isLang(l) ? l : 'fr'
  const jeton = String((await searchParams).jeton ?? '').slice(0, 600)
  const head = (
    <>
      <p className="eyebrow">{t('Espace professionnel', lang)}</p>
      <h1>{t('Finaliser votre fiche', lang)}</h1>
    </>
  )
  if (!finalizeTarget(jeton))
    return (
      <section className="auth-page auth-narrow container account-page">
        {head}
        <p className="auth-msg error">Lien invalide ou expiré. Demandez un nouveau lien à l’équipe DALIL.</p>
      </section>
    )
  const m = await currentMember()
  if (!m?._verified)
    return (
      <section className="auth-page auth-narrow container account-page">
        {head}
        <div className="button-row">
          <Link className="button primary" href={`/connexion/professionnel?next=${encodeURIComponent(`/finaliser?jeton=${jeton}`)}`}>
            {t('Se connecter pour continuer', lang)}
          </Link>
        </div>
      </section>
    )
  const r = await finalizeDraft(m, jeton)
  return (
    <section className="auth-page auth-narrow container account-page">
      {head}
      {'error' in r ? (
        <p className="auth-msg error">{r.error}</p>
      ) : (
        <>
          <div className="pro-status pro-pending">
            <b>{r.name}</b>
            <span>{t('Demande de rattachement envoyée : l’équipe DALIL la vérifie et vous prévient par email.', lang)}</span>
          </div>
          <div className="button-row">
            <Link className="button primary" href="/espace-pro">
              {t('Mon espace pro', lang)}
            </Link>
          </div>
        </>
      )}
    </section>
  )
}
