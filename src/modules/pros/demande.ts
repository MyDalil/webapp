import 'server-only'
import { TEAM, esc, layout, paragraphs, send } from '@/platform/mail'
import { payload } from '@/platform/http'
import { countEvent } from '@/platform/metrics'
import { ficheOffer, ficheOwner } from './offre'
import type { Lead } from '@/payload-types'
import type { LeadInput } from './offreRules'

const KIND_LABEL = { devis: 'Demande de devis', preinscription: 'Demande de pré-inscription', rappel: 'Demande de rappel' } as const

/**
 * Demande d’un visiteur sur une fiche privée : lead `nouveau` (collection `leads` du lot K), email au propriétaire,
 * compteur du jour. Plan payant : coordonnées complètes ; gratuit : « une demande vous attend, activez Pro pour la voir ».
 */
export async function submitLead(input: LeadInput, opts: { memberId?: number | null; country?: string } = {}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const [f, offer] = await Promise.all([ficheOwner(input.collection, input.id), ficheOffer(input.collection, input.id)])
  if (!f || !offer.lead) return { ok: false, error: 'Cette fiche ne reçoit pas de demande en ligne.', status: 404 }
  const p = await payload()
  await p.create({
    collection: 'leads',
    overrideAccess: true,
    data: {
      targetCollection: input.collection,
      targetId: input.id,
      kind: offer.lead,
      name: input.name,
      phone: input.phone,
      ...(input.email ? { email: input.email } : {}),
      message: input.message,
      consent: true,
      status: 'nouveau',
      ...(opts.memberId ? { member: opts.memberId } : {}),
      country: (opts.country ?? 'DZ') as Lead['country'],
    },
  })
  await countEvent({ collection: input.collection, id: input.id }, 'lead')
  const name = String(f.doc.name ?? f.doc.displayName ?? 'votre fiche')
  const title = `${KIND_LABEL[offer.lead]} pour « ${name} »`
  const paid = offer.plan !== 'gratuit'
  const body = paid
    ? `<p>Un visiteur de DALIL vous a envoyé une demande depuis votre fiche.</p>
       <p><b>Nom :</b> ${esc(input.name)}<br><b>Téléphone :</b> ${esc(input.phone)}${input.email ? `<br><b>Email :</b> ${esc(input.email)}` : ''}</p>
       ${paragraphs(input.message)}
       <p>Le visiteur a accepté que ses coordonnées vous soient transmises pour cette demande seulement.</p>`
    : `<p>Une demande vous attend sur DALIL pour votre fiche.</p><p>Activez l’offre Pro pour voir les coordonnées du visiteur et lui répondre.</p>`
  const cta = paid ? undefined : { label: 'Activer Pro', href: 'https://www.mydalil.com/espace-pro' }
  // Sans email de propriétaire : l’équipe reçoit l’alerte (sans les coordonnées du visiteur si la fiche est gratuite).
  await send(f.ownerEmail || TEAM, title, layout(esc(title), body, cta)).catch(() => {})
  return { ok: true }
}
