import type { CollectionConfig } from 'payload'
import { isAdmin, isAdminOrAdvisor } from '@/platform/access'

export const REQUEST_STATUS = [
  { label: 'Liste d’attente', value: 'attente' },
  { label: 'À contacter', value: 'a-contacter' },
  { label: 'En cours', value: 'en-cours' },
  { label: 'Terminée', value: 'terminee' },
  { label: 'Annulée', value: 'annulee' },
] as const

/** Demande d’accompagnement : données personnelles, lisibles par l’administration et les conseillers seulement. */
export const AccompagnementRequests: CollectionConfig = {
  slug: 'demandes-accompagnement',
  labels: { singular: 'Demande d’accompagnement', plural: 'Demandes d’accompagnement' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'pack', 'status', 'advisor', 'createdAt'], group: 'Accompagnement' },
  defaultSort: '-createdAt',
  access: { read: isAdminOrAdvisor, create: isAdmin, update: isAdminOrAdvisor, delete: isAdmin },
  fields: [
    { name: 'pack', type: 'relationship', relationTo: 'packs', label: 'Pack', required: true, index: true },
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', label: 'Nom', required: true },
        { name: 'email', type: 'email', label: 'Email', required: true },
        { name: 'phone', type: 'text', label: 'Téléphone ou WhatsApp' },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'country', type: 'text', label: 'Pays de résidence' },
        { name: 'persons', type: 'number', label: 'Nombre de personnes', min: 1, max: 20, defaultValue: 1 },
      ],
    },
    { name: 'message', type: 'textarea', label: 'Situation décrite' },
    { name: 'status', type: 'select', label: 'Statut', required: true, defaultValue: 'attente', options: [...REQUEST_STATUS], index: true, admin: { position: 'sidebar' } },
    { name: 'advisor', type: 'relationship', relationTo: 'users', label: 'Conseiller', admin: { position: 'sidebar' } },
    { name: 'notes', type: 'textarea', label: 'Notes internes', admin: { description: 'Jamais envoyées au demandeur.' } },
  ],
}
