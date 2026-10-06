import type { CollectionConfig } from 'payload'
import { anyone, isAdmin, isStaff } from '@/platform/access'

/** Photos des adresses (stockées sur Vercel Blob en ligne, sur disque en local). */
export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Photo', plural: 'Photos' },
  admin: { group: 'Annuaire', useAsTitle: 'alt', defaultColumns: ['filename', 'alt', 'credit', 'updatedAt'] },
  access: { read: anyone, create: isStaff, update: isStaff, delete: isAdmin },
  upload: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    imageSizes: [
      { name: 'thumb', width: 480, height: 360, position: 'centre' },
      { name: 'cover', width: 1600, height: 900, position: 'centre' },
    ],
    adminThumbnail: 'thumb',
    focalPoint: true,
  },
  fields: [
    { name: 'alt', type: 'text', label: 'Description (texte alternatif)', required: true },
    { name: 'credit', type: 'text', label: 'Crédit photo', admin: { description: 'Auteur ou source, affiché sous la photo.' } },
  ],
}
