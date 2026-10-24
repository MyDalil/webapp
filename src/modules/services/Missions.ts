import type { Access, CollectionConfig, Where } from 'payload'
import { isMember, isStaff } from '@/platform/access'
import { ACTIVITIES, CATEGORIES } from './activities'

/** Équipe : tout. Client : ses demandes. Prestataire : les demandes qui lui sont adressées. */
const readOwn: Access = (args) => {
  if (isStaff(args)) return true
  const { user } = args.req
  if (!isMember(user)) return false
  return { or: [{ client: { equals: user.id } }, { 'provider.owner': { equals: user.id } }] } as Where
}

export const MISSION_STATUS = [
  { label: 'Demande envoyée', value: 'requested' },
  { label: 'Acceptée', value: 'accepted' },
  { label: 'Refusée', value: 'declined' },
  { label: 'Sans réponse (expirée)', value: 'expired' },
  { label: 'Annulée', value: 'cancelled' },
  { label: 'Terminée', value: 'completed' },
] as const

/** Missions : demande du client, acceptation du prestataire sous 24 h, réalisation, avis. DALIL n’encaisse rien. */
export const Missions: CollectionConfig = {
  slug: 'missions',
  labels: { singular: 'Mission', plural: 'Missions' },
  admin: { group: 'Services', useAsTitle: 'start', defaultColumns: ['start', 'provider', 'client', 'activity', 'status'] },
  access: { read: readOwn, create: isStaff, update: isStaff, delete: isStaff },
  fields: [
    { type: 'row', fields: [{ name: 'provider', type: 'relationship', relationTo: 'providers', required: true, index: true }, { name: 'client', type: 'relationship', relationTo: 'members', required: true, index: true }] },
    { type: 'row', fields: [{ name: 'activity', type: 'select', required: true, options: ACTIVITIES.map((a) => ({ label: a.label, value: a.value })) }, { name: 'category', type: 'select', options: CATEGORIES.map((c) => ({ label: c.label, value: c.value })) }] },
    {
      type: 'row',
      fields: [
        { name: 'start', type: 'date', required: true, index: true, admin: { date: { pickerAppearance: 'dayAndTime' } } },
        { name: 'end', type: 'date', required: true, admin: { date: { pickerAppearance: 'dayAndTime' } } },
        { name: 'hours', type: 'number', required: true, label: 'Durée (h)' },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'pricing', type: 'select', required: true, options: [{ label: 'À l’heure', value: 'hour' }, { label: 'Forfait', value: 'flat' }] },
        { name: 'unitPrice', type: 'number', label: 'Prix unitaire (DA)' },
        { name: 'estimate', type: 'number', label: 'Estimation (DA)' },
      ],
    },
    { type: 'row', fields: [{ name: 'commune', type: 'text', required: true, label: 'Commune (identifiant)' }, { name: 'communeName', type: 'text', label: 'Commune' }] },
    { name: 'address', type: 'text', required: true, maxLength: 200, label: 'Adresse (transmise au prestataire après acceptation)' },
    { name: 'details', type: 'textarea', maxLength: 1000, label: 'Description du besoin' },
    { name: 'status', type: 'select', required: true, defaultValue: 'requested', index: true, options: MISSION_STATUS.map((s) => ({ ...s })) },
    { type: 'row', fields: [{ name: 'respondBy', type: 'date', required: true, label: 'Réponse attendue avant', admin: { date: { pickerAppearance: 'dayAndTime' } } }, { name: 'respondedAt', type: 'date', label: 'Répondu le' }, { name: 'completedAt', type: 'date', label: 'Terminée le' }] },
    { type: 'row', fields: [{ name: 'cancelledBy', type: 'select', options: [{ label: 'Client', value: 'client' }, { label: 'Prestataire', value: 'provider' }, { label: 'Équipe', value: 'staff' }] }, { name: 'cancelReason', type: 'text', label: 'Motif' }] },
    {
      type: 'row',
      fields: [
        { name: 'consentAt', type: 'date', required: true, label: 'Consentement du client' },
        { name: 'reminderSentAt', type: 'date', label: 'Rappel envoyé' },
        { name: 'reviewInviteSentAt', type: 'date', label: 'Invitation à l’avis envoyée' },
      ],
    },
    { type: 'row', fields: [{ name: 'clientNotifiedAt', type: 'date', admin: { hidden: true } }, { name: 'providerNotifiedAt', type: 'date', admin: { hidden: true } }] },
  ],
}
