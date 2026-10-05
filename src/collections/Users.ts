import type { CollectionConfig } from 'payload'
import { isAdmin, isAdminField } from '@/lib/access'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Membre de l’équipe', plural: 'Équipe' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'email', 'role'], group: 'Administration' },
  auth: true,
  access: {
    create: isAdmin,
    delete: isAdmin,
    read: ({ req: { user } }) => (user?.role === 'admin' ? true : { id: { equals: user?.id } }),
    update: ({ req: { user } }) => (user?.role === 'admin' ? true : { id: { equals: user?.id } }),
  },
  fields: [
    { name: 'name', type: 'text', label: 'Nom', required: true },
    {
      name: 'role',
      type: 'select',
      label: 'Rôle',
      required: true,
      defaultValue: 'editor',
      saveToJWT: true,
      access: { update: isAdminField, create: isAdminField },
      options: [
        { label: 'Administrateur — publie et gère tout', value: 'admin' },
        { label: 'Rédacteur — prépare, ne publie pas', value: 'editor' },
      ],
    },
  ],
}
