import type { CollectionConfig } from 'payload'
import { isAdmin, isStaff } from '@/platform/access'

/** Erreurs serveur regroupées par empreinte (message + route) : suivi sans service tiers, alerte email à la première occurrence. */
export const ErrorLogs: CollectionConfig = {
  slug: 'error-logs',
  labels: { singular: 'Erreur', plural: 'Erreurs du site' },
  admin: {
    group: 'Pilotage',
    useAsTitle: 'message',
    defaultColumns: ['message', 'route', 'count', 'lastSeen', 'resolved'],
    description: 'Erreurs serveur du site, regroupées. Une alerte part à l’équipe à la première occurrence. Cochez « Résolue » après correction : une nouvelle occurrence la rouvre.',
  },
  defaultSort: '-lastSeen',
  access: { read: isStaff, create: () => false, update: isStaff, delete: isAdmin },
  fields: [
    { name: 'fingerprint', type: 'text', required: true, unique: true, index: true, admin: { readOnly: true, hidden: true } },
    { name: 'message', type: 'text', required: true, label: 'Message', admin: { readOnly: true } },
    { type: 'row', fields: [
      { name: 'route', type: 'text', label: 'Route', admin: { readOnly: true } },
      { name: 'path', type: 'text', label: 'Dernière adresse', admin: { readOnly: true } },
      { name: 'method', type: 'text', label: 'Méthode', admin: { readOnly: true } },
      { name: 'routeType', type: 'text', label: 'Type', admin: { readOnly: true } },
    ] },
    { type: 'row', fields: [
      { name: 'count', type: 'number', label: 'Occurrences', defaultValue: 1, admin: { readOnly: true } },
      { name: 'firstSeen', type: 'date', label: 'Première fois', admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
      { name: 'lastSeen', type: 'date', label: 'Dernière fois', index: true, admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
      { name: 'resolved', type: 'checkbox', label: 'Résolue', defaultValue: false },
    ] },
    { name: 'digest', type: 'text', label: 'Référence Next', admin: { readOnly: true } },
    { name: 'stack', type: 'textarea', label: 'Pile d’appels', admin: { readOnly: true } },
  ],
}
