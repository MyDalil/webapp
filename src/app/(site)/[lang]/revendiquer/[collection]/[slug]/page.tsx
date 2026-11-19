import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from '@/platform/ui/Link'
import { currentMember } from '@/modules/membres'
import { claimTarget } from '@/modules/pros'
import { ClaimForm, isClaimTarget, proText as t } from '@/modules/pros/ui'
import { isLang } from '@/platform/i18n'

export const metadata: Metadata = { title: 'Revendiquer une fiche', robots: { index: false } }
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ lang: string; collection: string; slug: string }> }

/** « Vous êtes ce professionnel ? » → revendication sur justificatif (gratuite, sans effet sur la vérification). */
export default async function Revendiquer({ params }: Props) {
  const { lang: l, collection, slug } = await params
  const lang = isLang(l) ? l : 'fr'
  if (!isClaimTarget(collection)) notFound()
  const target = await claimTarget(collection, slug)
  if (!target) notFound()
  const m = await currentMember()
  return (
    <section className="auth-page auth-narrow container account-page">
      <p className="eyebrow">{t('Revendiquer cette fiche', lang)}</p>
      <h1>{target.name}</h1>
      <p className="muted-line">
        <Link href={target.path}>{t('Voir la fiche complète', lang)}</Link>
      </p>
      {target.owner != null ? <p className="auth-msg error">Cette fiche est déjà rattachée à un compte professionnel.</p> : <ClaimForm collection={collection} slug={slug} loggedIn={Boolean(m?._verified)} />}
    </section>
  )
}
