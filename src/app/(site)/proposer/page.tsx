import type { Metadata } from 'next'
import { Legacy } from '@/components/Legacy'

export const metadata: Metadata = {
  title: 'Contribuer',
  description: 'Proposez un lieu, corrigez une information ou partagez un média. Chaque contribution est vérifiée avant publication.',
}

export default function ProposerPage() {
  return (
    <>
      <section className="page-intro container compact">
        <p className="eyebrow">Contribuer</p>
        <h1>Aidez-nous à mieux documenter l’Algérie.</h1>
        <p>Proposez un lieu, corrigez une information ou partagez un média. Chaque contribution est vérifiée avant publication.</p>
      </section>
      <section className="contribution-layout container">
        <Legacy route="/proposer" skip={['subpage-hero']} />
        <aside className="moderation-note">
          <p className="eyebrow">Après l’envoi</p>
          <ol>
            <li>
              <b>1</b>
              <span>Votre contribution est enregistrée.</span>
            </li>
            <li>
              <b>2</b>
              <span>L’équipe contrôle les éléments.</span>
            </li>
            <li>
              <b>3</b>
              <span>Vous recevez le résultat de la vérification.</span>
            </li>
          </ol>
        </aside>
      </section>
    </>
  )
}
