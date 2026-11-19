import type { Metadata } from 'next'
import { currentMember } from '@/modules/membres'
import { ActivityForm, proText as t } from '@/modules/pros/ui'
import { isLang } from '@/platform/i18n'
import { WILAYAS } from '@/platform/referentiel/catalog'

export const metadata: Metadata = { title: 'Inscrire mon activité', robots: { index: false } }
export const dynamic = 'force-dynamic'

/** « Inscrire mon activité » : formulaire unique (santé, services à domicile, autre établissement). Aussi « Passer en compte Pro ». */
export default async function Inscrire({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: l } = await params
  const lang = isLang(l) ? l : 'fr'
  const m = await currentMember()
  const wilayas = WILAYAS.map(({ code, name }) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  return (
    <section className="auth-page container account-page">
      <p className="eyebrow">{t('Espace professionnel', lang)}</p>
      <h1>{t('Inscrire mon activité sur DALIL.', lang)}</h1>
      <p className="auth-lead">{t('Gratuit. Choisissez votre activité : nous ne demandons que les informations utiles.', lang)}</p>
      <ActivityForm wilayas={wilayas} loggedIn={Boolean(m?._verified)} prefill={{ phone: m?.phone ?? '' }} />
    </section>
  )
}
