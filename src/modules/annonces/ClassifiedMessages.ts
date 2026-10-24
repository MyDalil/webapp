import type { Access, CollectionConfig, Where } from 'payload'
import { isMember, isStaff } from '@/platform/access'

/** Équipe : tout (litiges, signalements). Membres : les messages de leurs conversations. */
const readOwn: Access = (args) => {
  if (isStaff(args)) return true
  const { user } = args.req
  if (!isMember(user)) return false
  return { or: [{ buyer: { equals: user.id } }, { 'classified.author': { equals: user.id } }] } as Where
}

/**
 * Messagerie DALIL d’une annonce : une conversation = une annonce + une personne intéressée.
 * Numéros et emails de la personne intéressée masqués tant que l’auteur n’a pas répondu.
 */
export const ClassifiedMessages: CollectionConfig = {
  slug: 'classified-messages',
  labels: { singular: 'Message', plural: 'Messages des annonces' },
  admin: { group: 'Annonces', useAsTitle: 'body', defaultColumns: ['classified', 'buyer', 'from', 'body', 'createdAt'] },
  access: { read: readOwn, create: isStaff, update: isStaff, delete: isStaff },
  fields: [
    { type: 'row', fields: [{ name: 'classified', type: 'relationship', relationTo: 'classifieds', required: true, index: true, label: 'Annonce' }, { name: 'buyer', type: 'relationship', relationTo: 'members', required: true, index: true, label: 'Personne intéressée' }] },
    { type: 'row', fields: [{ name: 'from', type: 'select', required: true, label: 'Auteur du message', options: [{ label: 'Personne intéressée', value: 'buyer' }, { label: 'Annonceur', value: 'seller' }, { label: 'DALIL', value: 'system' }] }, { name: 'readAt', type: 'date', label: 'Lu le' }] },
    { name: 'body', type: 'textarea', required: true, maxLength: 2000 },
  ],
}
