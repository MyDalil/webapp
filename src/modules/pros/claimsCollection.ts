import type { Access, CollectionAfterReadHook, CollectionConfig } from 'payload'
import { isAdmin, isAdminUser, isMember } from '@/platform/access'
import { CLAIM_DOC_MAX_BYTES, CLAIM_DOC_TYPES, CLAIM_PROOFS, CLAIM_PROOF_LABEL, CLAIM_STATUSES } from './claimsCore'
import { SUBSCRIPTION_TARGETS, TARGET_LABEL } from './subscriptionsCore'

/** Administrateur : tout ; membre connecté : ses demandes seulement. */
const readOwn: Access = ({ req: { user } }) => (isAdminUser(user) ? true : isMember(user) ? { member: { equals: user.id } } : false)

/**
 * Revendications de fiche (« c’est mon établissement »). Création par le membre connecté via la route serveur
 * (aucune création par l’API standard) ; décision par un administrateur (`decideClaim`). Sans effet sur la vérification.
 */
export const Claims: CollectionConfig = {
  slug: 'claims',
  labels: { singular: 'Revendication', plural: 'Revendications' },
  admin: { group: 'Professionnels', useAsTitle: 'targetId', defaultColumns: ['member', 'targetCollection', 'targetId', 'proofType', 'status', 'createdAt'] },
  access: { read: readOwn, create: isAdmin, update: isAdmin, delete: isAdmin },
  defaultSort: '-createdAt',
  fields: [
    { name: 'member', type: 'relationship', relationTo: 'members', label: 'Compte', required: true, index: true },
    {
      type: 'row',
      fields: [
        { name: 'targetCollection', type: 'select', label: 'Type de fiche', required: true, options: SUBSCRIPTION_TARGETS.map((value) => ({ label: TARGET_LABEL[value], value })) },
        { name: 'targetId', type: 'text', label: 'Identifiant de la fiche', required: true, index: true },
      ],
    },
    { name: 'proofType', type: 'select', label: 'Justificatif', required: true, options: CLAIM_PROOFS.map((value) => ({ label: CLAIM_PROOF_LABEL[value], value })) },
    { name: 'proofText', type: 'text', label: 'Détail du justificatif', maxLength: 500 },
    { name: 'proofFile', type: 'relationship', relationTo: 'claim-documents', label: 'Pièce jointe', access: { read: ({ req }) => isAdminUser(req.user) } },
    {
      name: 'status',
      type: 'select',
      label: 'État',
      required: true,
      defaultValue: 'en_attente',
      index: true,
      options: CLAIM_STATUSES.map((value) => ({ label: { en_attente: 'En attente', acceptee: 'Acceptée', refusee: 'Refusée' }[value], value })),
      admin: { position: 'sidebar', description: 'Décidez avec les boutons de la vue Validation : la fiche est alors rattachée au compte et le membre prévenu.' },
    },
    { name: 'note', type: 'textarea', label: 'Note de l’équipe', maxLength: 1000, access: { create: ({ req }) => isAdminUser(req.user), update: ({ req }) => isAdminUser(req.user) } },
  ],
}

/** Le contenu du fichier ne sort jamais par l’API standard (même pour l’équipe) : lecture serveur avec `context.withData`. */
const hideData: CollectionAfterReadHook = ({ doc, context }) => {
  if (!context?.withData) delete doc.data
  return doc
}

/**
 * Pièces des revendications (PDF, JPG, PNG ≤ 5 Mo), stockées dans la base DALIL (aucun stockage public, aucun tiers).
 * Lecture administrateur seulement, jamais publique. Écriture serveur seulement (`saveClaimDocument`).
 */
export const ClaimDocuments: CollectionConfig = {
  slug: 'claim-documents',
  labels: { singular: 'Pièce de revendication', plural: 'Pièces de revendication' },
  admin: { group: 'Professionnels', useAsTitle: 'filename', defaultColumns: ['filename', 'mimetype', 'size', 'member', 'createdAt'] },
  access: { read: isAdmin, create: () => false, update: () => false, delete: isAdmin },
  hooks: { afterRead: [hideData] },
  fields: [
    { name: 'member', type: 'relationship', relationTo: 'members', label: 'Compte', index: true },
    {
      type: 'row',
      fields: [
        { name: 'filename', type: 'text', label: 'Fichier', required: true, maxLength: 200 },
        { name: 'mimetype', type: 'select', label: 'Type', required: true, options: CLAIM_DOC_TYPES.map((value) => ({ label: value, value })) },
        { name: 'size', type: 'number', label: 'Taille (octets)', required: true, min: 1, max: CLAIM_DOC_MAX_BYTES },
      ],
    },
    // Contenu en base64 (5 Mo de fichier ≈ 6,7 millions de caractères).
    { name: 'data', type: 'textarea', required: true, maxLength: 7_000_000, admin: { hidden: true } },
  ],
}
