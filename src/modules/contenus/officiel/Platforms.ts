import type { Access, CollectionConfig } from 'payload'
import { isStaff, isStaffUser } from '@/platform/access'
import { listField, sourcesField, statusField } from './fields'

const publicOrStaff: Access = ({ req: { user } }) => (isStaffUser(user) ? true : { status: { equals: 'published' } })

/** Site officiel de démarches en ligne (équivalent algérien d’ANTS, service-public.gouv.fr…). */
export const Platforms: CollectionConfig = {
  slug: 'platforms',
  labels: { singular: 'Service en ligne officiel', plural: 'Services en ligne officiels' },
  admin: { group: 'Contenus', useAsTitle: 'name', defaultColumns: ['name', 'organisme', 'url', 'status'] },
  defaultSort: 'order',
  access: { read: publicOrStaff, create: isStaff, update: isStaff, delete: isStaff },
  fields: [
    { name: 'name', type: 'text', label: 'Nom', required: true },
    { name: 'slug', type: 'text', label: 'Identifiant', required: true, unique: true, index: true },
    { name: 'url', type: 'text', label: 'Adresse', required: true },
    { name: 'organisme', type: 'text', label: 'Organisme' },
    listField('services', 'Démarches faisables sur ce site'),
    sourcesField,
    { name: 'order', type: 'number', label: 'Ordre', defaultValue: 100, admin: { position: 'sidebar' } },
    statusField,
  ],
}
