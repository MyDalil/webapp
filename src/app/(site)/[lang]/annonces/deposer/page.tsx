import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import type { Media } from '@/payload-types'
import { currentMember } from '@/modules/annonces'
import { ClassifiedForm, type FormInitial } from '@/modules/annonces/ui'
import { payload } from '@/platform/http'
import { WILAYAS } from '@/platform/referentiel/catalog'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Déposer une annonce · DALIL', robots: { index: false } }

type Props = { searchParams: Promise<{ modifier?: string; categorie?: string }> }

/** Dépôt (ou modification avec « ?modifier=ID ») d’une annonce. Compte connecté obligatoire. */
export default async function Deposer({ searchParams }: Props) {
  const q = await searchParams
  const me = await currentMember()
  if (!me) redirect(`/connexion/particulier?next=${encodeURIComponent(`/annonces/deposer${q.modifier ? `?modifier=${q.modifier}` : q.categorie ? `?categorie=${q.categorie}` : ''}`)}`)
  let initial: FormInitial | undefined
  if (q.modifier) {
    const p = await payload()
    const c = await p.findByID({ collection: 'classifieds', id: Number(q.modifier), depth: 1, overrideAccess: true }).catch(() => null)
    const author = c && (typeof c.author === 'object' ? c.author?.id : c.author)
    if (!c || author !== me.id) redirect('/mon-compte#annonces')
    const { photos, author: _a, ...values } = c
    initial = {
      id: c.id,
      values: values as FormInitial['values'],
      photos: (photos ?? []).filter((m): m is Media => typeof m === 'object').map((m) => ({ id: m.id, thumb: m.sizes?.thumb?.url ?? m.url ?? '' })),
    }
  }
  const wilayas = WILAYAS.filter((w) => !w.transition).map(({ code, name }) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  return (
    <section className="auth-page container account-page">
      <p className="eyebrow">Annonces</p>
      <h1>{initial ? 'Modifier mon annonce.' : 'Déposer une annonce.'}</h1>
      {!me._verified && <p className="auth-msg error">Confirmez votre adresse email pour déposer une annonce : le lien vous a été envoyé à {me.email}.</p>}
      <p className="auth-lead">Gratuit. Contrôlée par l’équipe DALIL avant publication. En ligne 45 jours, renouvelable.</p>
      <ClassifiedForm wilayas={wilayas} initial={initial} defaultCategory={q.categorie} />
    </section>
  )
}
