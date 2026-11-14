import type { CollectionConfig } from 'payload'
import { isAdmin, isAgent, isStaffUser } from '@/platform/access'
import { RUBRIQUES, TOOLS } from './referentiel'

/**
 * Agents IA de DALIL (CEO, Editorial, Trust au départ).
 * Chacun se connecte par sa propre clé API, n’a que les rubriques et outils listés ici, et ne publie jamais.
 */
export const Agents: CollectionConfig = {
  slug: 'agents',
  labels: { singular: 'Agent', plural: 'Agents' },
  admin: { group: 'Équipe IA', useAsTitle: 'name', defaultColumns: ['name', 'status', 'provider', 'model', 'monthlyBudgetUsd'] },
  auth: { useAPIKey: true, disableLocalStrategy: true },
  access: {
    read: ({ req: { user } }) => (isStaffUser(user) ? true : isAgent(user) ? { id: { equals: user.id } } : false),
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', label: 'Nom', required: true },
        { name: 'slug', type: 'text', label: 'Identifiant', required: true, unique: true, index: true, admin: { description: 'ceo, editorial, trust…' } },
        {
          name: 'status',
          type: 'select',
          label: 'État',
          required: true,
          defaultValue: 'active',
          options: [
            { label: 'Actif', value: 'active' },
            { label: 'En réserve (activable en un clic)', value: 'reserve' },
            { label: 'En pause', value: 'paused' },
            { label: 'Désactivé', value: 'disabled' },
          ],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'roleId', type: 'text', label: 'Identifiant de rôle', index: true, admin: { readOnly: true, description: 'agent_id du dossier company/ (méthode ICM).' } },
        { name: 'department', type: 'text', label: 'Département', index: true, admin: { readOnly: true } },
      ],
    },
    { name: 'mission', type: 'textarea', label: 'Mission', required: true },
    {
      type: 'row',
      fields: [
        { name: 'provider', type: 'select', label: 'Fournisseur', required: true, defaultValue: 'anthropic', options: [{ label: 'Anthropic', value: 'anthropic' }, { label: 'OpenAI', value: 'openai' }] },
        { name: 'model', type: 'text', label: 'Modèle', required: true },
        { name: 'monthlyBudgetUsd', type: 'number', label: 'Budget mensuel (USD)', min: 0 },
        { name: 'maxStepsPerTask', type: 'number', label: 'Étapes max par tâche', defaultValue: 12, min: 1, max: 50 },
      ],
    },
    { name: 'scopes', type: 'select', hasMany: true, label: 'Rubriques autorisées', options: [...RUBRIQUES] },
    { name: 'tools', type: 'select', hasMany: true, label: 'Outils autorisés', options: [...TOOLS] },
    {
      type: 'row',
      fields: [
        { name: 'coldTestResult', type: 'select', label: 'Test à froid', options: [{ label: 'Réussi', value: 'pass' }, { label: 'Échoué', value: 'fail' }], admin: { readOnly: true } },
        { name: 'coldTestAt', type: 'date', label: 'Testé le', admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
        { name: 'coldTestDetail', type: 'text', label: 'Résultat du test', admin: { readOnly: true } },
      ],
    },
    {
      name: 'toolModes',
      type: 'array',
      label: 'Autonomie par outil',
      admin: { description: 'Vide = réglage par défaut (mode mixte). Les interdictions dures et Vie musulmane restent refusées par le code, quel que soit ce réglage.' },
      access: { update: ({ req: { user } }) => isStaffUser(user) },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'tool', type: 'select', label: 'Outil', required: true, options: [...TOOLS] },
            { name: 'mode', type: 'select', label: 'Mode', required: true, options: [{ label: 'Exécute seul (notifié)', value: 'execute' }, { label: 'Propose (validation humaine)', value: 'propose' }, { label: 'Interdit', value: 'forbidden' }] },
          ],
        },
      ],
    },
    {
      name: 'triggers',
      type: 'select',
      hasMany: true,
      label: 'Se réveille sur',
      options: [
        { label: 'Toute nouvelle tâche (routage)', value: 'any-task' },
        { label: 'Tâche qui lui est assignée', value: 'assigned' },
        { label: 'Brouillon prêt à vérifier', value: 'draft-ready' },
        { label: 'Nouveau message reçu', value: 'inbox' },
        { label: 'Signalement', value: 'report' },
        { label: 'Candidature pro', value: 'application' },
        { label: 'Tâche planifiée', value: 'cron' },
      ],
    },
    {
      name: 'memory',
      type: 'textarea',
      label: 'Mémoire résumée',
      admin: { description: 'Faits utiles appris au fil des tâches. Courte, revue par l’équipe. Les règles et skills sont dans le dépôt (company/departements/<nn>/agents/<rôle>/).' },
    },
  ],
}
