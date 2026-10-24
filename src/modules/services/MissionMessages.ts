import type { Access, CollectionConfig, Where } from 'payload'
import { isMember, isStaff } from '@/platform/access'

/** Équipe : tout (litiges). Participants : les messages de leurs missions. */
const readOwn: Access = (args) => {
  if (isStaff(args)) return true
  const { user } = args.req
  if (!isMember(user)) return false
  return { or: [{ 'mission.client': { equals: user.id } }, { 'mission.provider.owner': { equals: user.id } }] } as Where
}

/** Messagerie DALIL entre client et prestataire, rattachée à une mission. Aucun numéro affiché par DALIL. */
export const MissionMessages: CollectionConfig = {
  slug: 'mission-messages',
  labels: { singular: 'Message', plural: 'Messages des missions' },
  admin: { group: 'Services', useAsTitle: 'body', defaultColumns: ['mission', 'from', 'body', 'createdAt'] },
  access: { read: readOwn, create: isStaff, update: isStaff, delete: isStaff },
  fields: [
    { name: 'mission', type: 'relationship', relationTo: 'missions', required: true, index: true },
    { type: 'row', fields: [{ name: 'from', type: 'select', required: true, options: [{ label: 'Client', value: 'client' }, { label: 'Prestataire', value: 'provider' }, { label: 'DALIL', value: 'system' }] }, { name: 'readAt', type: 'date', label: 'Lu le' }] },
    { name: 'body', type: 'textarea', required: true, maxLength: 2000 },
  ],
}
