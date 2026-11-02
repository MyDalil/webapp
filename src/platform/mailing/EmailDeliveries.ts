import type { CollectionConfig } from 'payload'
import { isAdmin, isStaff } from '@/platform/access'

/**
 * Suivi des emails transactionnels : à envoyer → accepté par Resend → délivré, ou échec / rebond / plainte.
 * Ni contenu ni adresse en clair : sujet de l’email, empreinte du destinataire, clé d’idempotence.
 * Les événements « délivré », « rebond », « plainte » arrivent par le webhook Resend (/api/resend/evenements).
 */
export const EmailDeliveries: CollectionConfig = {
  slug: 'email-deliveries',
  labels: { singular: 'Email envoyé', plural: 'Emails envoyés' },
  admin: {
    group: 'Pilotage',
    useAsTitle: 'subject',
    defaultColumns: ['subject', 'status', 'attempts', 'updatedAt'],
    description: 'État de chaque email transactionnel. « Accepté » = pris en charge par Resend ; « Délivré » = reçu par le serveur du destinataire.',
  },
  defaultSort: '-createdAt',
  access: { read: isStaff, create: () => false, update: () => false, delete: isAdmin },
  fields: [
    { name: 'idempotencyKey', type: 'text', unique: true, index: true, label: 'Clé', admin: { readOnly: true } },
    { name: 'subject', type: 'text', required: true, label: 'Sujet', admin: { readOnly: true } },
    { type: 'row', fields: [
      { name: 'recipientHash', type: 'text', index: true, label: 'Destinataire (empreinte)', admin: { readOnly: true } },
      { name: 'providerId', type: 'text', index: true, label: 'Identifiant Resend', admin: { readOnly: true } },
    ] },
    { type: 'row', fields: [
      { name: 'status', type: 'select', required: true, index: true, label: 'État', options: [{ label: 'À envoyer', value: 'pending' }, { label: 'Accepté', value: 'accepted' }, { label: 'Délivré', value: 'delivered' }, { label: 'Échec', value: 'failed' }, { label: 'Rebond', value: 'bounced' }, { label: 'Plainte', value: 'complained' }, { label: 'Retardé', value: 'delayed' }], admin: { readOnly: true } },
      { name: 'attempts', type: 'number', label: 'Essais', defaultValue: 0, admin: { readOnly: true } },
    ] },
    { name: 'error', type: 'text', label: 'Dernière erreur', admin: { readOnly: true } },
  ],
}
