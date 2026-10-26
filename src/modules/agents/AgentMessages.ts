import type { CollectionBeforeChangeHook, CollectionConfig, Where } from 'payload'
import { actorOf, isAgent, isStaffUser } from '@/platform/access'

/** L’auteur d’un message vient de la session, jamais du contenu envoyé : un agent ne peut pas parler au nom de Saïd. */
const signer: CollectionBeforeChangeHook = ({ data, operation, req }) => {
  if (operation !== 'create') return data
  const a = actorOf(req.user)
  data.fromKind = a.kind
  data.fromLabel = a.label
  data.fromUser = a.kind === 'humain' ? a.id : undefined
  data.fromAgent = a.kind === 'agent' ? a.id : undefined
  data.channel = (req.context?.channel as string | undefined) ?? (a.kind === 'agent' ? 'agent' : 'admin')
  return data
}

/** Fil des échanges : agents entre eux, et agents ↔ Saïd et Rad (dashboard ou Telegram). Ajout seul. */
export const AgentMessages: CollectionConfig = {
  slug: 'agent-messages',
  labels: { singular: 'Message', plural: 'Conversations des agents' },
  admin: { group: 'Équipe IA', useAsTitle: 'body', defaultColumns: ['createdAt', 'fromLabel', 'toAgent', 'toHuman', 'kind', 'body'] },
  defaultSort: '-createdAt',
  access: {
    read: ({ req: { user } }) =>
      isStaffUser(user) ? true : isAgent(user) ? ({ or: [{ fromAgent: { equals: user.id } }, { toAgent: { equals: user.id } }] } as Where) : false,
    create: ({ req: { user } }) => isStaffUser(user) || isAgent(user),
    update: () => false,
    delete: () => false,
  },
  hooks: { beforeChange: [signer] },
  fields: [
    { name: 'task', type: 'relationship', relationTo: 'agent-tasks', label: 'Tâche', index: true },
    {
      type: 'row',
      fields: [
        { name: 'toAgent', type: 'relationship', relationTo: 'agents', label: 'À l’agent', index: true },
        { name: 'toHuman', type: 'select', label: 'À l’humain', options: [{ label: 'Saïd', value: 'patron' }, { label: 'Équipe (Saïd et Rad)', value: 'equipe' }] },
        { name: 'kind', type: 'select', label: 'Type', defaultValue: 'note', options: [{ label: 'Directive', value: 'directive' }, { label: 'Rapport', value: 'rapport' }, { label: 'Question', value: 'question' }, { label: 'Réponse', value: 'reponse' }, { label: 'Note', value: 'note' }] },
      ],
    },
    { name: 'body', type: 'textarea', label: 'Message', required: true, maxLength: 8000 },
    {
      type: 'row',
      fields: [
        { name: 'fromKind', type: 'select', label: 'Auteur', options: [{ label: 'Humain', value: 'humain' }, { label: 'Agent', value: 'agent' }, { label: 'Système', value: 'systeme' }, { label: 'Membre', value: 'membre' }], admin: { readOnly: true } },
        { name: 'fromLabel', type: 'text', label: 'Nom', admin: { readOnly: true } },
        { name: 'fromUser', type: 'relationship', relationTo: 'users', label: 'Compte', admin: { readOnly: true } },
        { name: 'fromAgent', type: 'relationship', relationTo: 'agents', label: 'Agent', admin: { readOnly: true } },
        { name: 'channel', type: 'select', label: 'Canal', options: [{ label: 'Administration', value: 'admin' }, { label: 'Telegram', value: 'telegram' }, { label: 'Agent', value: 'agent' }], admin: { readOnly: true } },
      ],
    },
  ],
}
