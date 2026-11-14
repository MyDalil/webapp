import { createHash } from 'crypto'
import type { CollectionBeforeChangeHook, CollectionBeforeOperationHook, CollectionConfig } from 'payload'
import { anyone, isAdmin, isStaff, isStaffUser } from '@/platform/access'

/** Empreinte SHA-256 du fichier reçu, avant tout traitement : repère les doublons. */
export const sha256 = (b: Buffer | Uint8Array) => createHash('sha256').update(b).digest('hex')

const hashIncoming: CollectionBeforeOperationHook = ({ args, req }) => {
  const data = req.file?.data
  if (data && data.length) req.context.mediaHash = sha256(data)
  return args
}
const setHash: CollectionBeforeChangeHook = ({ data, req }) => {
  if (typeof req.context.mediaHash === 'string') data.hash = req.context.mediaHash
  return data
}

/** Formats produits en WebP (sharp branché dans payload.config). Les anciens noms `thumb` et `cover` sont gardés. */
const webp = (quality: number) => ({ format: 'webp' as const, options: { quality } })

/**
 * Photos (stockées sur Vercel Blob en ligne, sur disque en local) : adresses, et photos envoyées par les comptes
 * (profil des prestataires, avis). Celles-ci sont publiées tout de suite puis contrôlées par l’équipe.
 */
export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Photo', plural: 'Photos' },
  admin: { group: 'Annuaire', useAsTitle: 'alt', defaultColumns: ['filename', 'alt', 'moderation', 'uploadedBy', 'updatedAt'] },
  hooks: { beforeOperation: [hashIncoming], beforeChange: [setHash] },
  access: { read: anyone, create: isStaff, update: isStaff, delete: isAdmin },
  upload: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    // Original plafonné à 2560 px (photos de téléphone), tailles en WebP.
    resizeOptions: { width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true },
    imageSizes: [
      { name: 'thumb', width: 480, height: 360, position: 'centre', formatOptions: webp(78) },
      { name: 'card', width: 800, height: 600, position: 'centre', formatOptions: webp(80) },
      { name: 'cover', width: 1600, height: 900, position: 'centre', formatOptions: webp(82) },
      { name: 'og', width: 1200, height: 630, position: 'centre', formatOptions: webp(82) },
    ],
    adminThumbnail: 'thumb',
    focalPoint: true,
  },
  fields: [
    { name: 'alt', type: 'text', label: 'Description (texte alternatif)', required: true },
    {
      type: 'row',
      fields: [
        { name: 'altAr', type: 'text', label: 'Description en arabe', admin: { rtl: true } },
        { name: 'altEn', type: 'text', label: 'Description en anglais' },
      ],
    },
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
    { name: 'hash', type: 'text', label: 'Empreinte du fichier', index: true, admin: { position: 'sidebar', readOnly: true, description: 'SHA-256 du fichier reçu : sert à repérer les doublons.' } },
    { name: 'uploadedBy', type: 'relationship', relationTo: 'members', label: 'Envoyée par', index: true, access: { read: ({ req }) => isStaffUser(req.user) }, admin: { position: 'sidebar', readOnly: true } },
  ],
}
