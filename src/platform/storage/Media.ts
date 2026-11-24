import { createHash } from 'crypto'
import type { CollectionAfterChangeHook, CollectionBeforeChangeHook, CollectionBeforeOperationHook, CollectionConfig } from 'payload'
import { after } from 'next/server'
import sharp from 'sharp'
import { thumbHashOf } from './thumbhash'
import { needsAlt } from './altRules'
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

/** Aperçu flou (ThumbHash) calculé à l’envoi du fichier, sur une copie réduite à 100 px au plus. Jamais bloquant. */
const setThumbHash: CollectionBeforeChangeHook = async ({ data, req }) => {
  const file = req.file?.data
  if (!file?.length) return data
  try {
    const { data: rgba, info } = await sharp(file).rotate().resize(100, 100, { fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    data.thumbhash = thumbHashOf(info.width, info.height, rgba)
  } catch {
    // image illisible par sharp : pas d’aperçu, l’envoi continue
  }
  return data
}

/** Texte alternatif vide (ou simple nom de fichier) à l’envoi : généré par l’IA après la réponse, si elle est configurée et sous plafond. */
const autoAlt: CollectionAfterChangeHook = ({ doc, operation, req }) => {
  if (operation !== 'create' || req.context?.altGenerated || !process.env.ANTHROPIC_API_KEY || !needsAlt(doc)) return doc
  const run = async () => {
    try {
      const { generateAlt } = await import('./alt')
      await generateAlt(req.payload, doc.id)
    } catch (e) {
      req.payload.logger?.warn?.(`Texte alternatif automatique non fait (photo ${doc.id}) : ${(e as Error).message.slice(0, 160)}`)
    }
  }
  try {
    after(run)
  } catch {
    void run()
  }
  return doc
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
  hooks: { beforeOperation: [hashIncoming], beforeChange: [setHash, setThumbHash], afterChange: [autoAlt] },
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
      // Non recadrée (hauteur libre) : galerie des photos libres copiées, cadrage identique à la source.
      { name: 'large', width: 1280, withoutEnlargement: true, formatOptions: webp(82) },
      // Logo officiel : contenu entier, jamais recadré, petit poids.
      { name: 'logo', width: 160, height: 160, fit: 'inside', withoutEnlargement: true, formatOptions: webp(85) },
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
      type: 'row',
      fields: [
        { name: 'license', type: 'text', label: 'Licence', admin: { description: 'Photo sous licence libre (ex. CC BY-SA 4.0) : affichée avec le crédit, obligatoire par la licence.' } },
        { name: 'sourceUrl', type: 'text', label: 'Page source', admin: { description: 'Page d’origine de la photo (Wikimedia Commons…) : lien posé sur le crédit.' } },
      ],
    },
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
    { name: 'thumbhash', type: 'text', label: 'Aperçu flou', admin: { position: 'sidebar', readOnly: true, description: 'ThumbHash calculé à l’envoi : fond provisoire pendant le chargement de la photo.' } },
    { name: 'uploadedBy', type: 'relationship', relationTo: 'members', label: 'Envoyée par', index: true, access: { read: ({ req }) => isStaffUser(req.user) }, admin: { position: 'sidebar', readOnly: true } },
  ],
}
