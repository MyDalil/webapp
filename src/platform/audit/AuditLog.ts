import type { CollectionConfig } from 'payload'
import { isAdmin } from '@/platform/access'

/**
 * Journal d’audit : qui a fait quoi, quand, sur quoi. Ajout seul.
 * Personne ne modifie ni ne supprime une ligne : ni l’équipe, ni les agents, ni le code
 * (refus dans l’accès Payload et par un déclencheur Postgres, voir la migration « tableau_de_bord_socle »).
 */
export const AuditLog: CollectionConfig = {
  slug: 'audit-log',
  labels: { singular: 'Action', plural: 'Journal d’audit' },
  admin: {
    group: 'Système',
    useAsTitle: 'summary',
    defaultColumns: ['createdAt', 'actorLabel', 'action', 'summary', 'actionId'],
    description: 'Ajout seul : aucune ligne ne peut être modifiée ni supprimée.',
  },
  defaultSort: '-createdAt',
  access: { read: isAdmin, create: () => false, update: () => false, delete: () => false },
  timestamps: true,
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'actorKind', type: 'select', label: 'Auteur', required: true, index: true, options: [{ label: 'Humain', value: 'humain' }, { label: 'Agent', value: 'agent' }, { label: 'Membre', value: 'membre' }, { label: 'Système', value: 'systeme' }] },
        { name: 'actorLabel', type: 'text', label: 'Nom', required: true },
        { name: 'actorId', type: 'number', label: 'ID auteur' },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'action', type: 'text', label: 'Action', required: true, index: true },
        { name: 'target', type: 'text', label: 'Collection', index: true },
        { name: 'targetId', type: 'text', label: 'ID cible', index: true },
      ],
    },
    { name: 'actionId', type: 'text', label: 'Identifiant d’action', unique: true, index: true, admin: { description: 'act_<UUIDv7> : relie le fil d’activité, Telegram et l’historique de la fiche.' } },
    {
      type: 'row',
      fields: [
        { name: 'agentSlug', type: 'text', label: 'Agent', index: true },
        { name: 'department', type: 'text', label: 'Département' },
        { name: 'taskId', type: 'text', label: 'Tâche', index: true },
        { name: 'step', type: 'number', label: 'Étape' },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'tool', type: 'text', label: 'Outil' },
        { name: 'environment', type: 'select', label: 'Environnement', options: [{ label: 'Production', value: 'production' }, { label: 'Preview', value: 'preview' }, { label: 'Développement', value: 'development' }] },
        { name: 'costMicros', type: 'number', label: 'Coût (µ$)' },
      ],
    },
    { name: 'summary', type: 'text', label: 'Résumé', required: true },
    { name: 'changes', type: 'json', label: 'Champs modifiés (avant → après)' },
    { name: 'channel', type: 'select', label: 'Canal', options: [{ label: 'Administration', value: 'admin' }, { label: 'Telegram', value: 'telegram' }, { label: 'API', value: 'api' }, { label: 'Agent', value: 'agent' }, { label: 'Tâche planifiée', value: 'cron' }] },
  ],
}
