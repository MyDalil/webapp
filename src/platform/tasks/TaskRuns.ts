import type { CollectionConfig } from 'payload'
import { isAdmin, isStaff } from '@/platform/access'

/**
 * Journal des tâches planifiées (/api/taches) : une ligne par tâche et par jour (`key` unique).
 * Sert de verrou (pas d’exécution concurrente), de clé d’idempotence (une tâche réussie n’est pas rejouée le même jour)
 * et de battement de cœur pour la surveillance (dernière sauvegarde complète, durée, volume, erreur).
 */
export const TaskRuns: CollectionConfig = {
  slug: 'task-runs',
  labels: { singular: 'Tâche planifiée', plural: 'Tâches planifiées' },
  admin: {
    group: 'Pilotage',
    useAsTitle: 'key',
    defaultColumns: ['name', 'day', 'status', 'durationMs', 'attempts', 'finishedAt'],
    description: 'Exécutions de la tâche quotidienne : état, durée, volume, erreur. Une tâche en échec est rejouée à l’appel suivant.',
  },
  defaultSort: '-startedAt',
  access: { read: isStaff, create: () => false, update: () => false, delete: isAdmin },
  fields: [
    { name: 'key', type: 'text', required: true, unique: true, index: true, admin: { readOnly: true } },
    { type: 'row', fields: [
      { name: 'name', type: 'text', required: true, index: true, label: 'Tâche', admin: { readOnly: true } },
      { name: 'day', type: 'text', required: true, label: 'Jour (Alger)', admin: { readOnly: true } },
      { name: 'status', type: 'select', required: true, index: true, label: 'État', options: [{ label: 'En cours', value: 'running' }, { label: 'Réussie', value: 'succeeded' }, { label: 'Échec', value: 'failed' }, { label: 'Ignorée', value: 'skipped' }], admin: { readOnly: true } },
    ] },
    { type: 'row', fields: [
      { name: 'startedAt', type: 'date', label: 'Début', index: true, admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
      { name: 'finishedAt', type: 'date', label: 'Fin', admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
      { name: 'durationMs', type: 'number', label: 'Durée (ms)', admin: { readOnly: true } },
      { name: 'attempts', type: 'number', label: 'Essais', defaultValue: 1, admin: { readOnly: true } },
    ] },
    { name: 'result', type: 'json', label: 'Résultat (volumes)', admin: { readOnly: true } },
    { name: 'error', type: 'textarea', label: 'Erreur', admin: { readOnly: true } },
  ],
}
