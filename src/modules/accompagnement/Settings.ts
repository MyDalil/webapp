import type { GlobalConfig } from 'payload'
import { isAdmin, isAdminUser, isAdvisorUser } from '@/platform/access'
import { isWhatsApp } from './rules'
import { refreshPages } from './refresh'

/** Réglages de l’accompagnement : lancement, paiement, contact du conseiller. */
export const AccompagnementSettings: GlobalConfig = {
  slug: 'accompagnement',
  label: 'Réglages de l’accompagnement',
  admin: { group: 'Accompagnement' },
  hooks: { afterChange: [() => refreshPages()] },
  access: { read: ({ req: { user } }) => isAdminUser(user) || isAdvisorUser(user), update: isAdmin },
  fields: [
    {
      name: 'mode',
      type: 'select',
      label: 'État de l’offre',
      required: true,
      defaultValue: 'cache',
      options: [
        { label: 'Cachée — rien n’apparaît sur www.mydalil.com (visible sur preview seulement)', value: 'cache' },
        { label: 'Liste d’attente — l’offre est visible, les demandes sont notées « en attente »', value: 'liste-attente' },
        { label: 'Ouverte — un conseiller traite les demandes', value: 'ouvert' },
      ],
    },
    {
      name: 'paymentEnabled',
      type: 'checkbox',
      label: 'Paiement en ligne activé',
      defaultValue: false,
      admin: { description: 'Aucun compte marchand pour l’instant : laisser décoché. Le conseiller communique les modalités de paiement.' },
    },
    { name: 'whatsapp', type: 'text', label: 'Numéro WhatsApp du conseiller', admin: { description: 'Format international, ex. +213…' }, validate: (v: unknown) => (!v || isWhatsApp(v) ? true : 'Numéro international attendu.') },
    { name: 'notifyEmail', type: 'email', label: 'Email qui reçoit les nouvelles demandes', admin: { description: 'Vide : salam@mydalil.com.' } },
  ],
}
