import { APIError, type CollectionAfterChangeHook, type CollectionAfterDeleteHook, type CollectionBeforeChangeHook, type CollectionConfig } from 'payload'
import { isAdmin, isStaff } from '@/platform/access'
import { countryField } from './country'
import { refreshSponsorships } from './refresh'
import { activationError, type SponsorTarget } from './sponsoringCore'

/** Passage à « active » : un paiement « reçu » lié ou une note de paiement explicite (règle du conseiller, 19 nov. 2026). */
const guardActivation: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const status = data.status ?? originalDoc?.status
  if (status !== 'active' || originalDoc?.status === 'active') return data
  const paymentNote = data.paymentNote ?? originalDoc?.paymentNote
  let hasReceivedPayment = false
  if (originalDoc?.id != null && !(typeof paymentNote === 'string' && paymentNote.trim())) {
    const { totalDocs } = await req.payload.count({ collection: 'payments', where: { and: [{ sponsorship: { equals: originalDoc.id } }, { status: { equals: 'recu' } }] }, overrideAccess: true, req })
    hasReceivedPayment = totalDocs > 0
  }
  const error = activationError({ status, previousStatus: originalDoc?.status, paymentNote, hasReceivedPayment })
  if (error) throw new APIError(error, 400, undefined, true)
  return data
}

const refreshAfterChange: CollectionAfterChangeHook = ({ doc, previousDoc }) => {
  refreshSponsorships([doc?.targetCollection as SponsorTarget, previousDoc?.targetCollection as SponsorTarget])
  return doc
}
const refreshAfterDelete: CollectionAfterDeleteHook = ({ doc }) => {
  refreshSponsorships([doc?.targetCollection as SponsorTarget])
  return doc
}

/**
 * Mise en avant payante d’une fiche (à la une, remontée, partenaire). Demande créée côté serveur, puis gérée par un administrateur.
 * Règle 4 (AGENTS.md racine) : aucun lien avec `confiance` — une mise en avant n’achète ni statut, ni critère, ni label.
 */
export const Sponsorships: CollectionConfig = {
  slug: 'sponsorships',
  labels: { singular: 'Mise en avant', plural: 'Mises en avant' },
  admin: { group: 'Professionnels', useAsTitle: 'targetId', defaultColumns: ['targetCollection', 'targetId', 'kind', 'wilaya', 'status', 'startsAt', 'endsAt'] },
  access: { read: isStaff, create: isAdmin, update: isAdmin, delete: isAdmin },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'targetCollection',
          type: 'select',
          label: 'Type de fiche',
          required: true,
          options: [
            { label: 'Adresse', value: 'places' },
            { label: 'Praticien', value: 'practitioners' },
            { label: 'Prestataire', value: 'providers' },
            { label: 'Annonce', value: 'classifieds' },
          ],
        },
        { name: 'targetId', type: 'text', label: 'Identifiant de la fiche', required: true, index: true },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'kind',
          type: 'select',
          label: 'Formule',
          required: true,
          options: [
            { label: 'À la une', value: 'a-la-une' },
            { label: 'Remontée', value: 'remontee' },
            { label: 'Partenaire', value: 'partenaire' },
          ],
        },
        { name: 'wilaya', type: 'text', label: 'Wilaya (facultatif)' },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'startsAt', type: 'date', label: 'Début' },
        { name: 'endsAt', type: 'date', label: 'Fin' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      label: 'État',
      required: true,
      defaultValue: 'demande',
      index: true,
      options: [
        { label: 'Demande', value: 'demande' },
        { label: 'Active', value: 'active' },
        { label: 'Terminée', value: 'terminee' },
        { label: 'Refusée', value: 'refusee' },
      ],
      admin: { position: 'sidebar' },
    },
    { name: 'paymentNote', type: 'text', label: 'Paiement', admin: { description: 'BaridiMob, CCP, espèces… et référence éventuelle. Pour activer : un paiement « Reçu » lié ou cette note.' } },
    { name: 'requestedBy', type: 'relationship', relationTo: 'members', label: 'Demandé par', admin: { position: 'sidebar' } },
    countryField(),
    { name: 'payments', type: 'join', collection: 'payments', on: 'sponsorship', label: 'Paiements liés', admin: { defaultColumns: ['reference', 'provider', 'amount', 'currency', 'status', 'paidAt'] } },
  ],
  hooks: { beforeChange: [guardActivation], afterChange: [refreshAfterChange], afterDelete: [refreshAfterDelete] },
}
