import type { CollectionConfig } from 'payload'
import { anyone, isAdmin, isStaff, isStaffUser } from '@/platform/access'

/**
 * Photos (stockées sur Vercel Blob en ligne, sur disque en local) : adresses, et photos envoyées par les comptes
 * (profil des prestataires, avis). Celles-ci sont publiées tout de suite puis contrôlées par l’équipe.
 */
export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Photo', plural: 'Photos' },
  admin: { group: 'Annuaire', useAsTitle: 'alt', defaultColumns: ['filename', 'alt', 'moderation', 'uploadedBy', 'updatedAt'] },
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
    {
      name: 'moderation',
      type: 'select',
      label: 'Contrôle',
      defaultValue: 'ok',
      index: true,
      options: [
        { label: 'Contrôlée', value: 'ok' },
        { label: 'À contrôler (envoyée par un compte)', value: 'to-check' },
      ],
      admin: { position: 'sidebar', description: 'Photo envoyée par un compte : déjà en ligne. Supprimez-la si elle pose problème.' },
    },
    { name: 'uploadedBy', type: 'relationship', relationTo: 'members', label: 'Envoyée par', index: true, access: { read: ({ req }) => isStaffUser(req.user) }, admin: { position: 'sidebar', readOnly: true } },
  ],
}
