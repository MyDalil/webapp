import type { Metadata } from 'next'
import Link from '@/platform/ui/Link'
import { redirect } from 'next/navigation'
import { currentMember, myPractitioner } from '@/modules/sante'
import { ProSpace } from '@/modules/sante/ui'
import { myProvider } from '@/modules/services'
import { ProviderSpace } from '@/modules/services/ui'
import { myKits, proDashboard } from '@/modules/pros'
import { ProBoard } from '@/modules/pros/ui'
import { isLang } from '@/platform/i18n'
import { WILAYAS } from '@/platform/referentiel/catalog'

export const metadata: Metadata = { title: 'Espace pro', robots: { index: false } }
export const dynamic = 'force-dynamic'

const SPACES = {
  services: { label: 'Prestataire de services', lead: 'Ménage, bricolage, garde d’enfants, cours, coaching…' },
  praticien: { label: 'Praticien de santé', lead: 'Agenda de rendez-vous en ligne, au cabinet ou en visio.' },
} as const

export default async function ProPage({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<{ espace?: string }> }) {
  const { lang: l } = await params
  const lang = isLang(l) ? l : 'fr'
  const m = await currentMember()
  const asked = (await searchParams).espace
  // Après connexion, retour sur l’espace demandé (services ou praticien), pas sur le choix.
  if (!m) redirect(`/connexion/professionnel?next=${encodeURIComponent(asked ? `/espace-pro?espace=${asked}` : '/espace-pro')}`)
  const [practitioner, provider] = m._verified ? await Promise.all([myPractitioner(m), myProvider(m)]) : [null, null]
  const space = asked === 'services' || asked === 'praticien' ? asked : provider ? 'services' : practitioner ? 'praticien' : null
  // Kit « Vérifié sur DALIL » : seulement pour les fiches du compte réellement vérifiées.
  const kits = m._verified ? await myKits(m).catch(() => []) : []
  // Tableau de bord (lot L1) : abonnement, revendications, demandes, statistiques, liens.
  const board = m._verified ? await proDashboard(m).catch(() => null) : null
  const wilayas = WILAYAS.map(({ code, name }) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  return (
    <section className="auth-page container account-page">
      <p className="eyebrow">Espace professionnel</p>
      <h1>{space === 'services' ? 'Vos demandes et votre fiche.' : space === 'praticien' ? 'Votre agenda et votre fiche.' : 'Quelle est votre activité ?'}</h1>
      {!m._verified ? (
        <p className="auth-msg error">Confirmez votre adresse email ({m.email}) pour activer votre espace professionnel.</p>
      ) : !space ? (
        <>
        {board && (board.targets.length > 0 || board.claims.length > 0) && <ProBoard board={board} lang={lang} />}
        <div className="auth-choice">
          {(Object.keys(SPACES) as (keyof typeof SPACES)[]).map((k) => (
            <Link key={k} className="auth-card" href={`/espace-pro?espace=${k}`}>
              <span className="auth-card-kicker">Je suis</span>
              <b>{SPACES[k].label}</b>
              <span>{SPACES[k].lead}</span>
            </Link>
          ))}
          <Link className="auth-card" href="/inscrire">
            <span className="auth-card-kicker">Je suis</span>
            <b>Autre établissement</b>
            <span>Restaurant, commerce, école, hôtel, agence…</span>
          </Link>
        </div>
        </>
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
          {kits.map((k) => (
            <p key={`${k.collection}:${k.slug}`} className="muted-line">
              Kit « Vérifié sur DALIL » pour {k.name} : <a href={`/api/kit/${k.collection}/${k.slug}?format=visuel`} download>visuel Instagram/Facebook</a> · <a href={`/api/kit/${k.collection}/${k.slug}?format=qr`} download>QR code (PNG)</a> · <a href={`/api/kit/${k.collection}/${k.slug}?format=qr&type=svg`} download>QR code (SVG)</a>
            </p>
          ))}
          {board && <ProBoard board={board} lang={lang} />}
        </>
      )}
    </section>
  )
}
