import type { CollectionConfig } from 'payload'
import { isAdmin, isStaff } from '@/platform/access'

/**
 * Données reçues du site public (formulaires d’origine du prototype DALIL).
 * Les créations passent uniquement par les routes /api du site (overrideAccess).
 */
export const Subscribers: CollectionConfig = {
  slug: 'subscribers',
  labels: { singular: 'Abonné', plural: 'Newsletter' },
  admin: { useAsTitle: 'email', defaultColumns: ['email', 'confirmedAt', 'unsubscribedAt', 'source', 'createdAt'], group: 'Boîte de réception' },
  access: { read: isStaff, create: isAdmin, update: isAdmin, delete: isAdmin },
  fields: [
    { name: 'email', type: 'email', required: true, unique: true },
    { name: 'source', type: 'text', label: 'Formulaire d’origine' },
    { name: 'confirmedAt', type: 'date', label: 'Inscription confirmée le', admin: { readOnly: true, description: 'Vide = lien de confirmation pas encore cliqué (ne pas lui écrire).' } },
    { name: 'unsubscribedAt', type: 'date', label: 'Désinscrit le', admin: { readOnly: true } },
    { name: 'token', type: 'text', index: true, admin: { hidden: true }, access: { read: () => false } },
    { name: 'unsubToken', type: 'text', index: true, admin: { hidden: true }, access: { read: () => false } },
  ],
}
