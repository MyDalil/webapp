import 'server-only'
import { ficheOffer } from '../offre'
import type { LeadTarget } from '../offreRules'
import { AskBox } from '../assistant/AskBox'
import { LeadForm } from './LeadForm'

/**
 * Boutons de l’offre pro sur une fiche (à placer dans la barre d’actions) : demande si la fiche a un propriétaire
 * ou un plan payant ; « Poser une question » en Premium seulement. Rien pour un lieu public ou officiel.
 */
export async function LeadFormSlot({ collection, id, category }: { collection: LeadTarget; id: string | number; category?: string | null }) {
  const offer = await ficheOffer(collection, id, category)
  if (!offer.lead && !offer.assistant) return null
  const target = { collection, id: String(id) }
  return (
    <>
      {offer.lead && <LeadForm target={target} kind={offer.lead} />}
      {offer.assistant && <AskBox target={target} />}
    </>
  )
}
