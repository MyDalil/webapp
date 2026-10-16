import type { CollectionConfig } from 'payload'
import { isAdmin, isStaff } from '@/platform/access'

/** Journal de consommation de l’IA (une ligne par appel) : compteur pour l’équipe, quotas et plafond mensuel. */
export const AiUsage: CollectionConfig = {
  slug: 'ai-usage',
  labels: { singular: 'Appel IA', plural: 'Consommation IA' },
  admin: {
    group: 'Pilotage',
    defaultColumns: ['createdAt', 'feature', 'member', 'inputTokens', 'outputTokens', 'costMicros'],
    description: 'Claude Haiku 4.5 : 1 $ par million de jetons en entrée, 5 $ en sortie. Coût en millionièmes de dollar (1 000 000 = 1 $). Plafond et quota : variables AI_MONTHLY_BUDGET_USD et AI_DAILY_QUOTA.',
  },
  access: { read: isStaff, create: () => false, update: () => false, delete: isAdmin },
  fields: [
    { type: 'row', fields: [{ name: 'feature', type: 'select', required: true, label: 'Usage', options: [{ label: 'Reformulation', value: 'reformulate' }, { label: 'Compréhension d’une demande', value: 'understand' }] }, { name: 'member', type: 'relationship', relationTo: 'members', label: 'Compte', index: true }] },
    { type: 'row', fields: [{ name: 'inputTokens', type: 'number', label: 'Jetons entrée' }, { name: 'outputTokens', type: 'number', label: 'Jetons sortie' }, { name: 'costMicros', type: 'number', label: 'Coût (µ$)' }, { name: 'model', type: 'text', label: 'Modèle' }] },
  ],
}
