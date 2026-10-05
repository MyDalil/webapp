import type { CollectionConfig } from 'payload'
import { anyone, isStaff } from '@/lib/access'
import { revalidateAfterChange } from '@/lib/revalidate'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Image', plural: 'Images' },
  admin: { group: 'Contenus', defaultColumns: ['filename', 'alt', 'credit'] },
  access: { read: anyone, create: isStaff, update: isStaff, delete: isStaff },
  hooks: { afterChange: [revalidateAfterChange] },
  fields: [
    { name: 'alt', type: 'text', label: 'Description (accessibilité)', localized: true, admin: { description: 'Obligatoire en français.' }, validate: (v: unknown, { req }: { req: { locale?: string } }) => (req.locale !== 'fr' || (typeof v === 'string' && v.trim()) ? true : 'Description requise') },
    { name: 'credit', type: 'text', label: 'Crédit photo', admin: { description: 'Auteur et licence. Obligatoire pour une image externe.' } },
    { name: 'sourceUrl', type: 'text', label: 'Lien source' },
  ],
  upload: {
    mimeTypes: ['image/*'],
    focalPoint: true,
    imageSizes: [
      { name: 'thumb', width: 480, height: 360, position: 'centre' },
      { name: 'card', width: 960, height: 720, position: 'centre' },
      { name: 'hero', width: 1920, height: undefined },
    ],
    formatOptions: { format: 'webp', options: { quality: 80 } },
  },
}
