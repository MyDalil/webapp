import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { currentMember } from '@/modules/annonces'
import { ClassifiedChat } from '@/modules/annonces/ui'
import { payload } from '@/platform/http'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Messagerie des annonces · DALIL', robots: { index: false } }

type Props = { searchParams: Promise<{ annonce?: string; contact?: string }> }

/** Conversation côté annonceur : une annonce + la personne qui a écrit. */
export default async function Messagerie({ searchParams }: Props) {
  const q = await searchParams
  const next = `/annonces/messagerie?annonce=${q.annonce ?? ''}&contact=${q.contact ?? ''}`
  const me = await currentMember()
  if (!me) redirect(`/connexion/particulier?next=${encodeURIComponent(next)}`)
  const p = await payload()
  const c = await p.findByID({ collection: 'classifieds', id: Number(q.annonce), depth: 0, overrideAccess: true }).catch(() => null)
  const buyer = await p.findByID({ collection: 'members', id: Number(q.contact), depth: 0, overrideAccess: true }).catch(() => null)
  const author = c && (typeof c.author === 'object' ? c.author?.id : c.author)
  if (!c || !buyer || author !== me.id) redirect('/mon-compte#annonces')
  return (
    <section className="auth-page container account-page">
      <Link className="back-link" href="/mon-compte#annonces">
        ← Mes annonces
      </Link>
      <p className="eyebrow">Annonce</p>
      <h1>{c.title}</h1>
      <ClassifiedChat id={c.id} contact={buyer.id} other={`${buyer.firstName} ${(buyer.lastName ?? '').charAt(0).toUpperCase()}.`} signedIn loginHref="/connexion/particulier" closed={c.status !== 'published'} />
    </section>
  )
}
