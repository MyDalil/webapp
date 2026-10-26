import type { Access, CollectionAfterChangeHook, CollectionAfterDeleteHook, CollectionConfig } from 'payload'
import { isStaff } from '@/platform/access'

const readPublished: Access = (args) => (isStaff(args) ? true : { status: { equals: 'published' } })

/** Recalcule la note moyenne et le nombre d’avis du prestataire. */
const refreshRating: CollectionAfterChangeHook = async ({ doc, req }) => {
  const providerId = typeof doc.provider === 'object' ? doc.provider.id : doc.provider
  const { docs } = await req.payload.find({ collection: 'provider-reviews', where: { and: [{ provider: { equals: providerId } }, { status: { equals: 'published' } }] }, depth: 0, limit: 5000, pagination: false, overrideAccess: true, req })
  const count = docs.length
  const avg = count ? Math.round((docs.reduce((s, r) => s + Number(r.rating), 0) / count) * 10) / 10 : null
  await req.payload.update({ collection: 'providers', id: providerId, data: { ratingAvg: avg, ratingCount: count }, overrideAccess: true, req })
  return doc
}
const refreshAfterDelete: CollectionAfterDeleteHook = async (args) => refreshRating({ ...args, operation: 'update', previousDoc: args.doc, data: args.doc } as never)

/** Avis : uniquement par le client d’une mission terminée via DALIL, un seul par mission. Modération par l’équipe. */
export const ProviderReviews: CollectionConfig = {
  slug: 'provider-reviews',
  labels: { singular: 'Avis', plural: 'Avis sur les prestataires' },
  admin: { group: 'Services', useAsTitle: 'comment', defaultColumns: ['provider', 'rating', 'comment', 'status', 'createdAt'] },
  access: { read: readPublished, create: isStaff, update: isStaff, delete: isStaff },
  hooks: { afterChange: [refreshRating], afterDelete: [refreshAfterDelete] },
  fields: [
    { type: 'row', fields: [{ name: 'mission', type: 'relationship', relationTo: 'missions', required: true, unique: true }, { name: 'provider', type: 'relationship', relationTo: 'providers', required: true, index: true }] },
    { type: 'row', fields: [{ name: 'author', type: 'relationship', relationTo: 'members', required: true }, { name: 'authorName', type: 'text', label: 'Signature publique', admin: { description: 'Prénom et initiale.' } }] },
    { type: 'row', fields: [{ name: 'rating', type: 'number', required: true, min: 1, max: 5, label: 'Note' }, { name: 'activity', type: 'text', label: 'Activité' }] },
    { name: 'comment', type: 'textarea', maxLength: 1000, label: 'Commentaire' },
    { name: 'photos', type: 'upload', relationTo: 'media', hasMany: true, maxRows: 4, label: 'Photos du travail réalisé', admin: { description: 'Publiées tout de suite, contrôlées ensuite par l’équipe (collection Photos, filtre « À contrôler »).' } },
    { name: 'reply', type: 'textarea', maxLength: 1000, label: 'Réponse du prestataire' },
    { name: 'status', type: 'select', required: true, defaultValue: 'published', options: [{ label: 'Publié', value: 'published' }, { label: 'Masqué par l’équipe', value: 'hidden' }], admin: { position: 'sidebar' } },
    { name: 'moderationNote', type: 'text', label: 'Note de modération (interne)', admin: { position: 'sidebar' } },
  ],
}
