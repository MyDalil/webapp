import type { CollectionConfig } from 'payload'
import { isAdmin, isStaff } from '@/lib/access'

/**
 * Données reçues du site public (formulaires d’origine du prototype DALIL).
 * Les créations passent uniquement par les routes /api du site (overrideAccess).
 */
export const Subscribers: CollectionConfig = {
  slug: 'subscribers',
  labels: { singular: 'Abonné', plural: 'Newsletter' },
  admin: { useAsTitle: 'email', defaultColumns: ['email', 'confirmedAt', 'source', 'createdAt'], group: 'Boîte de réception' },
  access: { read: isStaff, create: isAdmin, update: isAdmin, delete: isAdmin },
  fields: [
    { name: 'email', type: 'email', required: true, unique: true },
    { name: 'source', type: 'text', label: 'Formulaire d’origine' },
    { name: 'confirmedAt', type: 'date', label: 'Inscription confirmée le', admin: { readOnly: true, description: 'Vide = lien de confirmation pas encore cliqué (ne pas lui écrire).' } },
    { name: 'token', type: 'text', index: true, admin: { hidden: true }, access: { read: () => false } },
  ],
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
          ],
        },
        {
          name: 'status',
          type: 'select',
          label: 'Traitement',
          defaultValue: 'new',
          options: [
            { label: 'Nouveau', value: 'new' },
            { label: 'En cours', value: 'processing' },
            { label: 'Traité', value: 'done' },
            { label: 'Rejeté', value: 'rejected' },
          ],
        },
      ],
    },
    { name: 'subject', type: 'text', label: 'Objet', required: true },
    { name: 'email', type: 'text', label: 'Email' },
    { name: 'data', type: 'json', label: 'Contenu reçu' },
    { name: 'session', type: 'text', label: 'Session visiteur', admin: { readOnly: true } },
    { name: 'internalNote', type: 'textarea', label: 'Note interne' },
  ],
}

/** Profils test, favoris, listes et checklist des visiteurs (cookie de session, 7 jours). */
export const VisitorSessions: CollectionConfig = {
  slug: 'visitor-sessions',
  labels: { singular: 'Session visiteur', plural: 'Sessions visiteurs' },
  admin: { useAsTitle: 'sid', defaultColumns: ['sid', 'expiresAt', 'updatedAt'], group: 'Boîte de réception' },
  access: { read: isStaff, create: isAdmin, update: isAdmin, delete: isAdmin },
  fields: [
    { name: 'sid', type: 'text', required: true, unique: true, index: true },
    { name: 'expiresAt', type: 'date', required: true },
    { name: 'profile', type: 'json' },
    { name: 'state', type: 'json', label: 'Favoris, listes, checklist, parcours' },
  ],
}
