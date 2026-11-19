import type { CollectionConfig } from 'payload'
import { isAdmin } from '@/platform/access'
import { countryField } from './country'
import { PAYMENT_PROVIDERS, PAYMENT_PURPOSES, PAYMENT_STATUSES } from './sponsoringCore'

const PROVIDER_LABEL: Record<(typeof PAYMENT_PROVIDERS)[number], string> = {
  cib: 'Carte CIB', edahabia: 'Edahabia', baridimob: 'BaridiMob', ccp: 'CCP', especes: 'Espèces', virement: 'Virement', stripe: 'Stripe', chargily: 'Chargily Pay', slickpay: 'SlickPay', autre: 'Autre',
}
const PURPOSE_LABEL: Record<(typeof PAYMENT_PURPOSES)[number], string> = { abonnement: 'Abonnement', boost: 'Boost', projecteur: 'Projecteur', leads: 'Pack de demandes', autre: 'Autre' }
const STATUS_LABEL: Record<(typeof PAYMENT_STATUSES)[number], string> = { en_attente: 'En attente', recu: 'Reçu', rembourse: 'Remboursé', annule: 'Annulé' }

/**
 * Paiements reçus des professionnels (mise en avant, plus tard abonnements). Administrateurs seulement.
 * Montant en centimes (entier) : jamais de nombre à virgule pour de l’argent. Règle 4 : aucun lien avec `confiance`.
 */
export const Payments: CollectionConfig = {
  slug: 'payments',
  labels: { singular: 'Paiement', plural: 'Paiements' },
  admin: { group: 'Professionnels', useAsTitle: 'reference', defaultColumns: ['reference', 'provider', 'amount', 'currency', 'status', 'paidAt', 'member'] },
  access: { read: isAdmin, create: isAdmin, update: isAdmin, delete: isAdmin },
  defaultSort: '-createdAt',
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'provider', type: 'select', label: 'Moyen de paiement', required: true, options: PAYMENT_PROVIDERS.map((value) => ({ label: PROVIDER_LABEL[value], value })) },
        { name: 'reference', type: 'text', label: 'Référence', admin: { description: 'Numéro de transaction, de reçu ou de virement.' } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'purpose', type: 'select', label: 'Objet', defaultValue: 'autre', index: true, options: PAYMENT_PURPOSES.map((value) => ({ label: PURPOSE_LABEL[value], value })) },
        // Identifiant chez le fournisseur en ligne (Chargily, Stripe…) : unique, rend un webhook rejoué sans effet.
        { name: 'externalId', type: 'text', label: 'Identifiant chez le fournisseur', unique: true, index: true, admin: { readOnly: true } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'amount', type: 'number', label: 'Montant (centimes)', required: true, min: 0, admin: { step: 1, description: '1 500 DA = 150000.' }, validate: (v: unknown) => (v == null || (Number.isInteger(v) && (v as number) >= 0) ? true : 'Montant en centimes : un nombre entier positif.') },
        { name: 'currency', type: 'select', label: 'Devise', required: true, defaultValue: 'DZD', options: [{ label: 'Dinar (DZD)', value: 'DZD' }, { label: 'Euro (EUR)', value: 'EUR' }, { label: 'Dollar (USD)', value: 'USD' }] },
      ],
    },
    {
      name: 'status',
      type: 'select',
      label: 'État',
      required: true,
      defaultValue: 'en_attente',
      index: true,
      options: PAYMENT_STATUSES.map((value) => ({ label: STATUS_LABEL[value], value })),
      admin: { position: 'sidebar' },
    },
    { name: 'paidAt', type: 'date', label: 'Payé le', admin: { position: 'sidebar' } },
    { name: 'member', type: 'relationship', relationTo: 'members', label: 'Membre', admin: { position: 'sidebar' } },
    { name: 'sponsorship', type: 'relationship', relationTo: 'sponsorships', label: 'Mise en avant', index: true, admin: { position: 'sidebar' } },
    { name: 'subscription', type: 'relationship', relationTo: 'subscriptions', label: 'Abonnement', index: true, admin: { position: 'sidebar' } },
    {
      name: 'proofFile',
      type: 'relationship',
      relationTo: 'claim-documents',
      label: 'Justificatif',
      admin: { position: 'sidebar', description: 'Reçu téléversé par le professionnel (document privé, lecture administrateur seulement).' },
    },
    countryField(),
    { name: 'note', type: 'textarea', label: 'Note interne' },
  ],
}
