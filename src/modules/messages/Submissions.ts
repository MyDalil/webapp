import type { CollectionAfterChangeHook, CollectionConfig } from 'payload'
import { isAdmin, isStaff } from '@/platform/access'
import { notifySubmitter } from './notify'

/** Prévient le demandeur à chaque changement de statut fait par l’équipe. */
const statusEmail: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  // Réponse envoyée depuis la boîte unique : un seul email par action.
  if (operation !== 'update' || doc.status === previousDoc?.status || req.context?.skipNotify) return doc
  await notifySubmitter(doc)
  return doc
}

export const Submissions: CollectionConfig = {
  slug: 'submissions',
  labels: { singular: 'Demande', plural: 'Demandes reçues' },
  admin: { useAsTitle: 'subject', defaultColumns: ['subject', 'kind', 'status', 'createdAt'], group: 'Boîte de réception' },
  defaultSort: '-createdAt',
  access: { read: isStaff, create: isAdmin, update: isStaff, delete: isAdmin },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'kind',
          type: 'select',
          label: 'Type',
          required: true,
          options: [
            { label: 'Contribution (proposer une adresse)', value: 'contribution' },
            { label: 'Candidature professionnel', value: 'application' },
            { label: 'Demande de contact', value: 'contact' },
            { label: 'Avis (profil test)', value: 'feedback' },
            { label: 'Parcours personnalisé', value: 'diagnostic' },
            { label: 'Signalement d’une annonce', value: 'report' },
            { label: 'Email reçu', value: 'email' },
          ],
        },
        {
          name: 'status',
          type: 'select',
          label: 'Traitement',
          defaultValue: 'new',
          options: [
            { label: 'Nouveau', value: 'new' },
            { label: 'En cours de vérification', value: 'processing' },
            { label: 'Informations manquantes', value: 'needs_info' },
            { label: 'Validé / publié', value: 'done' },
            { label: 'Refusé', value: 'rejected' },
          ],
        },
      ],
    },
    { name: 'subject', type: 'text', label: 'Objet', required: true },
    { name: 'email', type: 'text', label: 'Email' },
    { name: 'data', type: 'json', label: 'Contenu reçu' },
    { name: 'session', type: 'text', label: 'Session visiteur', admin: { readOnly: true } },
    {
      name: 'reply',
      type: 'textarea',
      label: 'Message au demandeur',
      validate: (value: unknown, { siblingData }: { siblingData: Record<string, unknown> }) =>
        ['needs_info', 'rejected'].includes(String(siblingData?.status)) && ['contribution', 'application'].includes(String(siblingData?.kind)) && siblingData?.email && !value
          ? 'Expliquez au demandeur ce qui manque ou pourquoi la demande est refusée.'
          : true,
      admin: {
        description:
          'Envoyé par email avec le changement de statut (contributions et candidatures avec email). Obligatoire pour « Informations manquantes » et « Refusé ».',
      },
    },
    { name: 'internalNote', type: 'textarea', label: 'Note interne (jamais envoyée)' },
    { name: 'thread', type: 'json', label: 'Réponses envoyées', admin: { readOnly: true, description: 'Réponses de l’équipe depuis la boîte unique : date, auteur, texte, état d’envoi.' } },
    { name: 'externalId', type: 'text', label: 'Identifiant du message reçu', unique: true, index: true, admin: { readOnly: true, position: 'sidebar' } },
  ],
  hooks: { afterChange: [statusEmail] },
}
