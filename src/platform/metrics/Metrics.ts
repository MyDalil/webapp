import type { CollectionConfig } from 'payload'
import { isAdmin, isStaff } from '@/platform/access'

const counter = (name: string, label: string) => ({ name, type: 'number' as const, label, required: true, defaultValue: 0, min: 0, admin: { readOnly: true } })

/**
 * Compteurs agrégés par jour et par fiche (vues, appels, WhatsApp, itinéraires, partages, demandes).
 * Jamais par visiteur : aucune donnée personnelle. Écriture serveur seulement (`countEvent`), lecture équipe.
 */
export const MetricsDaily: CollectionConfig = {
  slug: 'metrics-daily',
  labels: { singular: 'Statistique du jour', plural: 'Statistiques par jour' },
  admin: { group: 'Pilotage', useAsTitle: 'targetId', defaultColumns: ['day', 'targetCollection', 'targetId', 'views', 'calls', 'whatsapp', 'leads'] },
  access: { read: isStaff, create: () => false, update: () => false, delete: isAdmin },
  defaultSort: '-day',
  indexes: [{ fields: ['day', 'targetCollection', 'targetId'], unique: true }],
  fields: [
    { name: 'day', type: 'date', label: 'Jour', required: true, index: true, admin: { readOnly: true, date: { pickerAppearance: 'dayOnly' } } },
    {
      type: 'row',
      fields: [
        { name: 'targetCollection', type: 'text', label: 'Type de fiche', required: true, admin: { readOnly: true } },
        { name: 'targetId', type: 'text', label: 'Identifiant de la fiche', required: true, index: true, admin: { readOnly: true } },
      ],
    },
    { type: 'row', fields: [counter('views', 'Vues'), counter('calls', 'Appels'), counter('whatsapp', 'WhatsApp')] },
    { type: 'row', fields: [counter('directions', 'Itinéraires'), counter('shares', 'Partages'), counter('leads', 'Demandes')] },
  ],
}
