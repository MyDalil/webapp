import type { Metadata } from 'next'
import Link from '@/platform/ui/Link'
import { redirect } from 'next/navigation'
import { currentMember, myPractitioner } from '@/modules/sante'
import { ProSpace } from '@/modules/sante/ui'
import { myProvider } from '@/modules/services'
import { ProviderSpace } from '@/modules/services/ui'
import { WILAYAS } from '@/platform/referentiel/catalog'

export const metadata: Metadata = { title: 'Espace pro · DALIL', robots: { index: false } }
export const dynamic = 'force-dynamic'

const SPACES = {
  services: { label: 'Prestataire de services', lead: 'Ménage, bricolage, garde d’enfants, cours, coaching…' },
  praticien: { label: 'Praticien de santé', lead: 'Agenda de rendez-vous en ligne, au cabinet ou en visio.' },
} as const

export default async function ProPage({ searchParams }: { searchParams: Promise<{ espace?: string }> }) {
  const m = await currentMember()
  const asked = (await searchParams).espace
  // Après connexion, retour sur l’espace demandé (services ou praticien), pas sur le choix.
  if (!m) redirect(`/connexion/professionnel?next=${encodeURIComponent(asked ? `/espace-pro?espace=${asked}` : '/espace-pro')}`)
  const [practitioner, provider] = m._verified ? await Promise.all([myPractitioner(m), myProvider(m)]) : [null, null]
  const space = asked === 'services' || asked === 'praticien' ? asked : provider ? 'services' : practitioner ? 'praticien' : null
  const wilayas = WILAYAS.filter((w) => !w.transition).map(({ code, name }) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  return (
    <section className="auth-page container account-page">
      <p className="eyebrow">Espace professionnel</p>
      <h1>{space === 'services' ? 'Vos demandes et votre fiche.' : space === 'praticien' ? 'Votre agenda et votre fiche.' : 'Quelle est votre activité ?'}</h1>
      {!m._verified ? (
        <p className="auth-msg error">Confirmez votre adresse email ({m.email}) pour activer votre espace professionnel.</p>
      ) : !space ? (
        <div className="auth-choice">
          {(Object.keys(SPACES) as (keyof typeof SPACES)[]).map((k) => (
            <Link key={k} className="auth-card" href={`/espace-pro?espace=${k}`}>
              <span className="auth-card-kicker">Je suis</span>
              <b>{SPACES[k].label}</b>
              <span>{SPACES[k].lead}</span>
            </Link>
          ))}
        </div>
      ) : (
        <>
          <div className="auth-tabs pro-tabs" role="tablist" aria-label="Espace">
            {(Object.keys(SPACES) as (keyof typeof SPACES)[]).map((k) => (
              <Link key={k} role="tab" aria-selected={space === k} href={`/espace-pro?espace=${k}`}>
                {SPACES[k].label}
              </Link>
            ))}
          </div>
          {space === 'services' ? <ProviderSpace wilayas={wilayas} /> : <ProSpace wilayas={wilayas} />}
        </>
      )}
    </section>
  )
}
