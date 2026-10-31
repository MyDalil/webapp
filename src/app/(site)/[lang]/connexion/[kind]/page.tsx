import type { Metadata } from 'next'
import Link from '@/platform/ui/Link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { AuthPanel } from '@/modules/membres/ui'

type Props = { params: Promise<{ kind: string }> }
const KINDS = { particulier: 'particulier', professionnel: 'pro' } as const

export const metadata: Metadata = { title: 'Connexion · DALIL' }
export const generateStaticParams = () => Object.keys(KINDS).map((kind) => ({ kind }))

export default async function Auth({ params }: Props) {
  const { kind } = await params
  const k = KINDS[kind as keyof typeof KINDS]
  if (!k) notFound()
  return (
    <section className="auth-page auth-narrow container">
      <Link className="back-link" href="/connexion">
        ← Particulier ou professionnel
      </Link>
      <p className="eyebrow">{k === 'pro' ? 'Espace professionnel' : 'Espace particulier'}</p>
      <h1>{k === 'pro' ? 'Votre activité sur DALIL.' : 'Votre espace DALIL.'}</h1>
      <Suspense>
        <AuthPanel kind={k} />
      </Suspense>
    </section>
  )
}
