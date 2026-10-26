import type { CollectionAfterReadHook, CollectionConfig } from 'payload'
import { isStaff } from '@/platform/access'

const hideData: CollectionAfterReadHook = ({ doc, context }) => {
  if (!context?.withData) delete doc.data
  return doc
}

/**
 * Photos proposées par les habitants avec une contribution : privées jusqu’à validation (stockées dans la base,
 * jamais sur un stockage public), visibles par l’équipe seulement. L’auteur certifie être l’auteur et accepte
 * la licence CC BY 4.0 (décision de Rad, 2026-10-17). Supprimées automatiquement 90 jours après l’envoi.
 */
export const ContributionPhotos: CollectionConfig = {
  slug: 'contribution-photos',
  labels: { singular: 'Photo proposée', plural: 'Photos proposées' },
  admin: { group: 'Boîte de réception', useAsTitle: 'filename', defaultColumns: ['submission', 'author', 'filename', 'createdAt', 'expiresAt'] },
  access: { read: isStaff, create: () => false, update: () => false, delete: isStaff },
  hooks: { afterRead: [hideData] },
  fields: [
    { name: 'submission', type: 'relationship', relationTo: 'submissions', required: true, index: true, label: 'Contribution' },
    { type: 'row', fields: [{ name: 'author', type: 'text', required: true, label: 'Auteur (crédit)' }, { name: 'license', type: 'text', required: true, defaultValue: 'CC BY 4.0', label: 'Licence' }] },
    { name: 'certifiedAt', type: 'date', required: true, label: 'Auteur certifié et licence acceptée le', admin: { readOnly: true } },
    { type: 'row', fields: [{ name: 'filename', type: 'text', label: 'Fichier' }, { name: 'mimetype', type: 'text', label: 'Type' }, { name: 'size', type: 'number', label: 'Taille (octets)' }] },
    { name: 'expiresAt', type: 'date', required: true, label: 'Suppression automatique le', admin: { readOnly: true } },
    { name: 'view', type: 'ui', admin: { components: { Field: '@/modules/messages/admin/PhotoLink#PhotoLink' } } },
    { name: 'data', type: 'textarea', required: true, maxLength: 6_000_000, admin: { hidden: true } },
  ],
}
