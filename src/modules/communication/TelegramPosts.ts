import { APIError, type CollectionBeforeChangeHook, type CollectionConfig } from 'payload'
import { actorOf, isAgent, isPatronUser, isStaffUser } from '@/platform/access'

/** États qui mettent un message sur le canal (ou le programment). Réservés au patron. */
const PUBLISHING = ['scheduled', 'publishing', 'published', 'deleted'] as const

/**
 * Seul Saïd (rôle patron) programme, publie ou retire une publication du canal.
 * L’équipe et les agents préparent des brouillons. Le contrôle est côté serveur : un bouton masqué ne suffit pas.
 */
const onlyPatronPublishes: CollectionBeforeChangeHook = ({ data, originalDoc, operation, req }) => {
  const before = originalDoc?.status ?? 'draft'
  const after = data.status ?? before
  const sysJob = req.context?.telegramWorker === true // l’envoi programmé lui-même (après décision de Saïd)
  if (after !== before && (PUBLISHING as readonly string[]).includes(after) && !isPatronUser(req.user) && !sysJob) {
    throw new APIError('Seul Saïd publie sur le canal Telegram.', 403)
  }
  if (!sysJob && ['published', 'publishing'].includes(before) && ('text' in data && data.text !== originalDoc?.text) && !isPatronUser(req.user)) {
    throw new APIError('Publication déjà sur le canal : seul Saïd la modifie.', 403)
  }
  if (operation === 'create') {
    const a = actorOf(req.user)
    data.preparedBy = a.label
    if (!data.status) data.status = 'draft'
  }
  if (after === 'scheduled' && before !== 'scheduled' && isPatronUser(req.user)) {
    data.decidedBy = (req.user as { id: number }).id
    data.decidedAt = new Date().toISOString()
  }
  return data
}

export const TelegramPosts: CollectionConfig = {
  slug: 'telegram-posts',
  labels: { singular: 'Publication Telegram', plural: 'Canal Telegram' },
  admin: { group: 'Communication', useAsTitle: 'title', defaultColumns: ['title', 'status', 'scheduledAt', 'preparedBy', 'views'] },
  defaultSort: '-updatedAt',
  access: {
    read: ({ req: { user } }) => isStaffUser(user) || isAgent(user),
    create: ({ req: { user } }) => isStaffUser(user) || isAgent(user),
    update: ({ req: { user } }) => (isStaffUser(user) ? true : isAgent(user) ? { status: { equals: 'draft' } } : false),
    delete: ({ req: { user } }) => isPatronUser(user),
  },
  hooks: { beforeChange: [onlyPatronPublishes] },
  fields: [
    { name: 'title', type: 'text', label: 'Titre interne', required: true },
    {
      name: 'status',
      type: 'select',
      label: 'État',
      required: true,
      defaultValue: 'draft',
      index: true,
      options: [
        { label: 'Brouillon', value: 'draft' },
        { label: 'Programmée (Saïd)', value: 'scheduled' },
        { label: 'Envoi en cours', value: 'publishing' },
        { label: 'Publiée', value: 'published' },
        { label: 'Échec d’envoi', value: 'failed' },
        { label: 'Retirée du canal (Saïd)', value: 'deleted' },
      ],
      admin: { description: 'Programmer, publier et retirer : Saïd seul.' },
    },
    { name: 'text', type: 'textarea', label: 'Texte (français)', required: true, maxLength: 4096 },
    { name: 'textAr', type: 'textarea', label: 'Texte (arabe)', maxLength: 4096, admin: { rtl: true } },
    { name: 'photo', type: 'upload', relationTo: 'media', label: 'Photo' },
    {
      name: 'buttons',
      type: 'array',
      label: 'Boutons lien',
      maxRows: 3,
      fields: [
        { type: 'row', fields: [{ name: 'label', type: 'text', label: 'Libellé', required: true, maxLength: 40 }, { name: 'url', type: 'text', label: 'Lien', required: true }] },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'scheduledAt', type: 'date', label: 'Date de publication', admin: { date: { pickerAppearance: 'dayAndTime' } } },
        { name: 'silent', type: 'checkbox', label: 'Notification silencieuse', defaultValue: false },
        { name: 'pin', type: 'checkbox', label: 'Épingler', defaultValue: false },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'preparedBy', type: 'text', label: 'Préparée par', admin: { readOnly: true } },
        { name: 'decidedBy', type: 'relationship', relationTo: 'users', label: 'Décidée par', admin: { readOnly: true } },
        { name: 'decidedAt', type: 'date', label: 'Décidée le', admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'messageId', type: 'number', label: 'ID du message Telegram', admin: { readOnly: true } },
        { name: 'publishedAt', type: 'date', label: 'Publiée le', admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
        { name: 'views', type: 'number', label: 'Vues', admin: { readOnly: true } },
      ],
    },
    { name: 'error', type: 'text', label: 'Dernière erreur', admin: { readOnly: true } },
  ],
}
