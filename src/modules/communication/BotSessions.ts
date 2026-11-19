import type { CollectionConfig } from 'payload'

/**
 * État d’une conversation guidée avec le bot (Telegram, WhatsApp) : étape et réponses en cours, avec expiration.
 * Accès serveur seulement (aucune lecture ni écriture par l’API, même pour l’équipe) ; cachée dans /admin.
 */
export const BotSessions: CollectionConfig = {
  slug: 'bot-sessions',
  labels: { singular: 'Conversation du bot', plural: 'Conversations du bot' },
  admin: { hidden: true, group: 'Communication' },
  access: { read: () => false, create: () => false, update: () => false, delete: () => false },
  indexes: [{ fields: ['channel', 'chatId'], unique: true }],
  fields: [
    { name: 'channel', type: 'select', required: true, options: [{ label: 'Telegram', value: 'telegram' }, { label: 'WhatsApp', value: 'whatsapp' }] },
    { name: 'chatId', type: 'text', required: true, index: true },
    { name: 'step', type: 'text' },
    { name: 'data', type: 'json' },
    { name: 'expiresAt', type: 'date', index: true },
  ],
}
