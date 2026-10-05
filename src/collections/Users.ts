import type { CollectionConfig } from 'payload'
import { isAdmin, isAdminField } from '@/lib/access'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Membre de l’équipe', plural: 'Équipe' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'email', 'role'], group: 'Administration' },
  auth: { tokenExpiration: 60 * 60 * 24 * 7, maxLoginAttempts: 8, lockTime: 15 * 60 * 1000 },
  hooks: {
    beforeChange: [
      // Le tout premier compte créé sur /admin devient administrateur.
      async ({ data, operation, req }) => {
        if (operation === 'create') {
          const { totalDocs } = await req.payload.count({ collection: 'users', overrideAccess: true })
          if (totalDocs === 0) return { ...data, role: 'admin' }
        }
        return data
      },
    ],
  },
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
