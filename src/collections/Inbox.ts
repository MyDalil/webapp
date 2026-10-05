import type { CollectionConfig } from 'payload'
import { isAdmin, isStaff } from '@/lib/access'

/** Créations publiques uniquement via les server actions du site (overrideAccess). */
export const Subscribers: CollectionConfig = {
  slug: 'subscribers',
  labels: { singular: 'Abonné', plural: 'Newsletter' },
  admin: { useAsTitle: 'email', defaultColumns: ['email', 'locale', 'createdAt'], group: 'Boîte de réception' },
  access: { read: isStaff, create: isAdmin, update: isAdmin, delete: isAdmin },
  fields: [
    { name: 'email', type: 'email', required: true, unique: true },
    { name: 'locale', type: 'text', label: 'Langue' },
    { name: 'consentAt', type: 'date', label: 'Consentement le' },
  ],
}

export const Submissions: CollectionConfig = {
  slug: 'submissions',
  labels: { singular: 'Demande', plural: 'Demandes reçues' },
  admin: {
    useAsTitle: 'subject',
    defaultColumns: ['subject', 'kind', 'status', 'createdAt'],
    group: 'Boîte de réception',
  },
  defaultSort: '-createdAt',
  access: { read: isStaff, create: isAdmin, update: isStaff, delete: isAdmin },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'kind',
          type: 'select',
          label: 'Type',
          required: true,
          options: [
            { label: 'Proposition d’adresse', value: 'address' },
            { label: 'Candidature professionnel', value: 'pro' },
            { label: 'Signalement / correction', value: 'correction' },
            { label: 'Avis sur le site', value: 'feedback' },
          ],
        },
        {
          name: 'status',
          type: 'select',
          label: 'Traitement',
          defaultValue: 'new',
          options: [
            { label: 'Nouveau', value: 'new' },
            { label: 'En cours', value: 'processing' },
            { label: 'Traité', value: 'done' },
            { label: 'Rejeté', value: 'rejected' },
          ],
        },
      ],
    },
    { name: 'subject', type: 'text', label: 'Objet', required: true },
    {
      type: 'row',
      fields: [
        { name: 'contactName', type: 'text', label: 'Nom' },
        { name: 'contactEmail', type: 'email', label: 'Email' },
        { name: 'contactPhone', type: 'text', label: 'Téléphone' },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'sector', type: 'text', label: 'Secteur' },
        { name: 'wilaya', type: 'text', label: 'Wilaya' },
      ],
    },
    { name: 'message', type: 'textarea', label: 'Message' },
    { name: 'pageUrl', type: 'text', label: 'Page concernée' },
    { name: 'locale', type: 'text', label: 'Langue' },
    { name: 'internalNote', type: 'textarea', label: 'Note interne' },
    { name: 'listing', type: 'relationship', relationTo: 'listings', label: 'Fiche créée / concernée' },
  ],
}
