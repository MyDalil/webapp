import type { Access, CollectionConfig } from 'payload'
import { isAdmin, isAdminUser, isMember } from '@/platform/access'
import { countryField } from './country'
import { SUBSCRIPTION_TARGETS, TARGET_LABEL } from './subscriptionsCore'

/** Administrateur : tout ; membre connecté : les demandes qu’il a envoyées (member = demandeur) ; personne d’autre. Le propriétaire de la fiche les lit par son espace pro (serveur). */
const readOwn: Access = ({ req: { user } }) => (isAdminUser(user) ? true : isMember(user) ? { member: { equals: user.id } } : false)

/**
 * Demandes envoyées à un professionnel depuis sa fiche (devis, préinscription, rappel, rendez-vous).
 * Création serveur seulement (route publique avec limite de débit, consentement obligatoire) ; jamais lisible publiquement.
 */
export const Leads: CollectionConfig = {
  slug: 'leads',
  labels: { singular: 'Demande de contact', plural: 'Demandes de contact' },
  admin: { group: 'Professionnels', useAsTitle: 'name', defaultColumns: ['name', 'kind', 'targetCollection', 'targetId', 'status', 'createdAt'] },
  access: { read: readOwn, create: isAdmin, update: isAdmin, delete: isAdmin },
  defaultSort: '-createdAt',
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'targetCollection', type: 'select', label: 'Type de fiche', required: true, options: SUBSCRIPTION_TARGETS.map((value) => ({ label: TARGET_LABEL[value], value })) },
        { name: 'targetId', type: 'text', label: 'Identifiant de la fiche', required: true, index: true },
      ],
    },
    { name: 'kind', type: 'select', label: 'Demande', required: true, options: [{ label: 'Devis', value: 'devis' }, { label: 'Préinscription', value: 'preinscription' }, { label: 'Être rappelé', value: 'rappel' }, { label: 'Rendez-vous', value: 'rdv' }] },
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', label: 'Nom', required: true, maxLength: 120 },
        { name: 'phone', type: 'text', label: 'Téléphone', required: true, maxLength: 30 },
        { name: 'email', type: 'email', label: 'Email' },
      ],
    },
    { name: 'message', type: 'textarea', label: 'Message', maxLength: 1000 },
    { name: 'consent', type: 'checkbox', label: 'Accepte d’être recontacté', required: true, validate: (v: unknown) => (v === true ? true : 'Consentement obligatoire.') },
    {
      name: 'status',
      type: 'select',
      label: 'État',
      required: true,
      defaultValue: 'nouveau',
      index: true,
      options: [{ label: 'Nouveau', value: 'nouveau' }, { label: 'Transmis', value: 'transmis' }, { label: 'Traité', value: 'traite' }, { label: 'Indésirable', value: 'spam' }],
      admin: { position: 'sidebar' },
    },
    { name: 'member', type: 'relationship', relationTo: 'members', label: 'Demandeur (compte)', index: true, admin: { position: 'sidebar', description: 'Visiteur connecté qui envoie la demande (facultatif). Le destinataire est le propriétaire de la fiche (champ owner), jamais ce champ.' } },
    countryField(),
  ],
}
