import { APIError, type CollectionBeforeChangeHook, type CollectionConfig } from 'payload'
import { isAgent, isPatronUser, isStaffUser } from '@/platform/access'
import { AGENT_STATUSES, RUBRIQUES, TASK_STATUS, touchesForbidden, type TaskStatus } from './referentiel'

/** Champs qu’un agent n’a jamais le droit de changer sur une tâche. */
const HUMAN_ONLY = ['agent', 'origin', 'issuedByUser', 'issuedByAgent', 'budgetUsd', 'maxSteps', 'reviewedBy', 'reviewedAt', 'directive', 'priority'] as const

const guard: CollectionBeforeChangeHook = async ({ data, originalDoc, operation, req }) => {
  const user = req.user
  // Vie musulmane : interdite aux agents, à la création comme à la modification.
  if (touchesForbidden(data.title ?? originalDoc?.title, data.instructions ?? originalDoc?.instructions, data.rubrique)) {
    if (isAgent(user) || data.agent || originalDoc?.agent) throw new APIError('La rubrique Vie musulmane est gérée par le patron uniquement. Aucun agent n’y travaille.', 403)
  }

  if (operation === 'create') {
    if (isAgent(user)) {
      data.origin = 'agent'
      data.issuedByAgent = user.id
      data.issuedByUser = undefined
      data.status = 'new'
    } else if (isStaffUser(user)) {
      data.origin = isPatronUser(user) ? 'patron' : 'equipe'
      data.issuedByUser = (user as { id: number }).id
    }
    return data
  }

  const before = (originalDoc?.status ?? 'new') as TaskStatus
  const after = (data.status ?? before) as TaskStatus

  if (isAgent(user)) {
    if (Number(originalDoc?.agent?.id ?? originalDoc?.agent) !== user.id) throw new APIError('Tâche d’un autre agent.', 403)
    for (const k of HUMAN_ONLY) if (k in data && JSON.stringify(data[k]) !== JSON.stringify(originalDoc?.[k])) throw new APIError(`Champ réservé à l’équipe : ${k}.`, 403)
    if (after !== before && !AGENT_STATUSES.includes(after)) throw new APIError('Un agent ne valide, n’annule ni ne met en pause une tâche.', 403)
    if (['paused', 'cancelled', 'done'].includes(before)) throw new APIError('Tâche arrêtée par l’équipe.', 409)
    return data
  }

  // Humains : l’ordre du patron l’emporte. Un autre membre de l’équipe ne l’annule ni ne le modifie.
  if (originalDoc?.origin === 'patron' && !isPatronUser(user)) {
    const changed = ['status', 'instructions', 'directive', 'agent'].filter((k) => k in data && JSON.stringify(data[k]) !== JSON.stringify(originalDoc?.[k]))
    if (changed.length) throw new APIError('Tâche ordonnée par Saïd : lui seul peut la modifier ou l’annuler. Laissez-lui un message.', 403)
  }
  if (after === 'done' && before !== 'done') {
    data.reviewedBy = (user as { id?: number } | null)?.id
    data.reviewedAt = new Date().toISOString()
  }
  return data
}

/** Tâches des agents : la file de travail visible et pilotable par Saïd et Rad à tout moment. */
export const AgentTasks: CollectionConfig = {
  slug: 'agent-tasks',
  labels: { singular: 'Tâche', plural: 'Tâches des agents' },
  admin: { group: 'Équipe IA', useAsTitle: 'title', defaultColumns: ['title', 'agent', 'status', 'priority', 'origin', 'updatedAt'] },
  defaultSort: '-updatedAt',
  access: {
    read: ({ req: { user } }) => (isStaffUser(user) ? true : isAgent(user) ? { agent: { equals: user.id } } : false),
    create: ({ req: { user } }) => isStaffUser(user) || isAgent(user),
    update: ({ req: { user } }) => (isStaffUser(user) ? true : isAgent(user) ? { agent: { equals: user.id } } : false),
    delete: () => false,
  },
  hooks: { beforeChange: [guard] },
  fields: [
    { name: 'title', type: 'text', label: 'Tâche', required: true },
    { name: 'instructions', type: 'textarea', label: 'Consignes', required: true },
    {
      type: 'row',
      fields: [
        { name: 'agent', type: 'relationship', relationTo: 'agents', label: 'Agent', index: true, admin: { description: 'Vide = le CEO décide.' } },
        { name: 'status', type: 'select', label: 'État', required: true, defaultValue: 'new', index: true, options: [...TASK_STATUS] },
        { name: 'priority', type: 'select', label: 'Priorité', defaultValue: 'normal', options: [{ label: 'Basse', value: 'low' }, { label: 'Normale', value: 'normal' }, { label: 'Haute', value: 'high' }, { label: 'Urgente', value: 'urgent' }] },
        { name: 'rubrique', type: 'select', label: 'Rubrique', options: [...RUBRIQUES] },
      ],
    },
    {
      name: 'directive',
      type: 'textarea',
      label: 'Directive en cours (Saïd, Rad)',
      admin: { description: 'Une nouvelle consigne pendant le travail. L’agent la lit avant chaque étape.' },
    },
    {
      type: 'row',
      fields: [
        { name: 'origin', type: 'select', label: 'Origine', options: [{ label: 'Saïd (patron)', value: 'patron' }, { label: 'Équipe', value: 'equipe' }, { label: 'Agent', value: 'agent' }, { label: 'Tâche planifiée', value: 'cron' }, { label: 'Événement du site', value: 'evenement' }, { label: 'Telegram', value: 'telegram' }], admin: { readOnly: true } },
        { name: 'issuedByUser', type: 'relationship', relationTo: 'users', label: 'Demandée par', admin: { readOnly: true } },
        { name: 'issuedByAgent', type: 'relationship', relationTo: 'agents', label: 'Créée par l’agent', admin: { readOnly: true } },
        { name: 'parent', type: 'relationship', relationTo: 'agent-tasks', label: 'Tâche parente' },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'budgetUsd', type: 'number', label: 'Budget de la tâche (USD)', min: 0 },
        { name: 'spentMicros', type: 'number', label: 'Dépensé (µ$)', defaultValue: 0, admin: { readOnly: true } },
        { name: 'steps', type: 'number', label: 'Étapes faites', defaultValue: 0, admin: { readOnly: true } },
        { name: 'maxSteps', type: 'number', label: 'Étapes max', min: 1, max: 50 },
      ],
    },
    { name: 'result', type: 'textarea', label: 'Résultat ou rapport' },
    {
      name: 'proposal',
      type: 'json',
      label: 'Proposition à valider',
      admin: { description: 'Ce que l’agent propose de publier ou d’envoyer. Rien n’est appliqué sans validation humaine.' },
    },
    {
      type: 'row',
      fields: [
        { name: 'reviewedBy', type: 'relationship', relationTo: 'users', label: 'Validée par', admin: { readOnly: true } },
        { name: 'reviewedAt', type: 'date', label: 'Validée le', admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
      ],
    },
    { name: 'error', type: 'text', label: 'Dernière erreur', admin: { readOnly: true } },
  ],
}
