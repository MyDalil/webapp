import type { Metadata } from 'next'
import Link from 'next/link'
import { Icon } from '@/platform/ui/Icon'
import { Legacy } from '@/modules/contenus/ui'

export const metadata: Metadata = {
  title: 'S’installer & Vivre en Algérie',
  description: 'Des parcours concrets selon votre situation, votre ville et vos priorités : logement, école, santé, transport, vie quotidienne.',
}

const JOURNEYS: [string, string, string, string][] = [
  ['home', 'Logement', 'Trouver, louer ou acheter avec des repères fiables.', '/guides/logement'],
  ['school', 'Éducation', 'Comparer les écoles et préparer la scolarité.', '/guides/ecole-et-famille'],
  ['health', 'Santé', 'Comprendre les soins, assurances et établissements.', '/guides/sante'],
  ['car', 'Transports', 'Se déplacer au quotidien selon sa ville.', '/guides/transport'],
  ['briefcase', 'Vie quotidienne', 'Banques, télécoms, achats et services utiles.', '/vie-pratique'],
  ['users', 'Parcours de vie', 'Famille, études, activité ou nouvelle étape.', '/diagnostic'],
]

const STEPS: [string, string, string, string][] = [
  ['01', 'Définir sa ville', 'Comparer le coût, les services et le cadre de vie.', '/guides/choisir-sa-ville'],
  ['02', 'Préparer ses documents', 'Identifier les pièces et les délais.', '/guides/documents-et-demarches'],
  ['03', 'Organiser le logement', 'Sécuriser la recherche et la visite.', '/guides/logement'],
  ['04', 'Installer son quotidien', 'École, santé, banque et transport.', '/guides/preparer-son-installation'],
]

export default function InstallationPage() {
  return (
    <>
      <section className="split-hero container">
        <div>
          <p className="eyebrow">S’installer &amp; Vivre</p>
          <h1>Avancez, étape par étape.</h1>
          <p>Des parcours concrets selon votre situation, votre ville et vos priorités.</p>
          <div className="button-row">
            <Link className="button primary" href="/diagnostic">
              Construire mon parcours
            </Link>
            <Link className="button outline" href="/guides/choisir-sa-ville">
              Choisir une ville
            </Link>
          </div>
        </div>
        <div className="split-photo photo-oran">
          <div className="photo-caption">
            <span>Oran</span>
            <strong>Vivre près de la Méditerranée</strong>
          </div>
        </div>
      </section>
      <section className="section container">
        <div className="section-head">
          <div>
            <p className="eyebrow">Tous les repères</p>
            <h2>Une vue claire de votre quotidien.</h2>
            <p>Commencez par le sujet le plus important pour vous.</p>
          </div>
        </div>
        <div className="journey-grid">
          {JOURNEYS.map(([icon, title, copy, href]) => (
            <Link className="journey-card" href={href} key={title}>
              <span>
                <Icon name={icon} />
              </span>
              <div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </div>
              <Icon name="arrow" />
            </Link>
          ))}
        </div>
      </section>
      <section className="steps-section section-tint">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">Parcours recommandé</p>
              <h2>Les quatre premières étapes.</h2>
              <p>Un ordre simple, modifiable à tout moment.</p>
            </div>
          </div>
          <div className="step-list">
            {STEPS.map(([n, t, c, href]) => (
              <Link href={href} key={n}>
                <b>{n}</b>
                <div>
                  <span>{t}</span>
                  <small>{c}</small>
                </div>
                <Icon name="arrow" />
              </Link>
            ))}
          </div>
        </div>
      </section>
      <Legacy route="/installation" skip={['portal-hero']} />
    </>
  )
}
