import type { Metadata } from 'next'
import Link from 'next/link'
import { Legacy } from '@/components/Legacy'

export const metadata: Metadata = {
  title: 'Label DALIL Excellence',
  description: 'Le label indépendant qui distingue l’excellence : une décision documentée, qui ne s’achète pas.',
}

const PILLARS = [
  ['01', 'Qualité de service', 'Accueil, rapidité, constance et considération.'],
  ['02', 'Expérience client', 'Confort, ambiance, accessibilité et clarté.'],
  ['03', 'Conformité & hygiène', 'Propreté, sanitaires et maîtrise opérationnelle.'],
  ['04', 'Valeur réelle', 'Qualité des produits, quantité et justesse des prix.'],
  ['05', 'Impact local', 'Originalité, ancrage et contribution au territoire.'],
]

export default function LabelPage() {
  return (
    <>
      <section className="excellence-hero container">
        <div className="excellence-copy">
          <p className="eyebrow gold">Qualité · Confiance · Algérie</p>
          <h1>Le label indépendant qui distingue l’excellence.</h1>
          <p>DALIL Excellence valorisera les établissements dont la qualité est remarquable, constante et vérifiée sur le terrain.</p>
          <div className="button-row">
            <a className="button primary" href="#methode">
              Découvrir la méthode
            </a>
            <Link className="button outline" href="/annuaire">
              Voir les établissements
            </Link>
          </div>
        </div>
        <div className="seal-wrap">
          <div className="seal">
            <span>DALIL</span>
            <strong>Excellence</strong>
            <i>QUALITÉ INDÉPENDANTE</i>
          </div>
        </div>
      </section>
      <section className="section container" id="methode">
        <div className="section-head">
          <div>
            <p className="eyebrow">Une méthode exigeante</p>
            <h2>Cinq piliers, une décision indépendante.</h2>
            <p>L’abonnement professionnel ne donne aucun droit au label.</p>
          </div>
        </div>
        <div className="pillar-grid">
          {PILLARS.map(([n, t, c]) => (
            <article className="pillar" key={n}>
              <span>{n}</span>
              <h3>{t}</h3>
              <p>{c}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="independence-banner">
        <div className="container">
          <div>
            <p className="eyebrow gold">Principe essentiel</p>
            <h2>Le label ne s’achète pas.</h2>
          </div>
          <p>Il est attribué après une évaluation documentée, peut être suspendu et fait l’objet de contrôles réguliers.</p>
        </div>
      </section>
      <Legacy route="/label" skip={['subpage-hero']} />
    </>
  )
}
