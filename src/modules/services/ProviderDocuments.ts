import type { CollectionAfterReadHook, CollectionConfig } from 'payload'
import { isStaff } from '@/platform/access'

export const DOCUMENT_KINDS = [
  { label: 'Pièce d’identité', value: 'identity' },
  { label: 'Statut légal (carte auto-entrepreneur ou registre de commerce)', value: 'legal' },
  { label: 'Casier judiciaire (bulletin n° 3)', value: 'background' },
] as const

/** Le contenu du fichier ne sort jamais par l’API standard : consultation par le lien réservé à l’équipe. */
const hideData: CollectionAfterReadHook = ({ doc, context }) => {
  if (!context?.withData) delete doc.data
  return doc
}

/**
 * Pièces justificatives des prestataires, stockées dans la base DALIL (pas de stockage public ni de service tiers),
 * visibles par l’équipe seulement. Supprimées dès que la vérification correspondante est faite, ou au plus tard 30 jours après l’envoi.
 */
export const ProviderDocuments: CollectionConfig = {
  slug: 'provider-documents',
  labels: { singular: 'Pièce justificative', plural: 'Pièces justificatives' },
  admin: { group: 'Services', useAsTitle: 'filename', defaultColumns: ['provider', 'kind', 'filename', 'createdAt', 'expiresAt'] },
  access: { read: isStaff, create: isStaff, update: () => false, delete: isStaff },
  hooks: { afterRead: [hideData] },
  fields: [
    { name: 'provider', type: 'relationship', relationTo: 'providers', required: true, index: true },
    { name: 'kind', type: 'select', required: true, label: 'Pièce', options: DOCUMENT_KINDS.map((k) => ({ ...k })) },
    { type: 'row', fields: [{ name: 'filename', type: 'text', label: 'Fichier' }, { name: 'mimetype', type: 'text', label: 'Type' }, { name: 'size', type: 'number', label: 'Taille (octets)' }] },
    { name: 'expiresAt', type: 'date', required: true, label: 'Suppression automatique le', admin: { readOnly: true } },
    { name: 'view', type: 'ui', admin: { components: { Field: '@/modules/services/admin/DocumentLink#DocumentLink' } } },
    // Contenu encodé en base64 (4 Mo de fichier ≈ 5,6 millions de caractères).
    { name: 'data', type: 'textarea', required: true, maxLength: 6_000_000, admin: { hidden: true } },
  ],
}
