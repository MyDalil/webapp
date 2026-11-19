import { revalidateTag } from 'next/cache'
import type { GlobalAfterChangeHook, GlobalConfig } from 'payload'
import { anyone, isAdmin } from '@/platform/access'
import { DEFAULT_ANNUAL_FREE_MONTHS } from './subscriptionsCore'

/** Étiquette du cache des tarifs (`getPricing`). */
export const PRICING_TAG = 'pricing'

const refresh: GlobalAfterChangeHook = ({ doc }) => {
  try {
    revalidateTag(PRICING_TAG, { expire: 0 })
  } catch {
    /* hors contexte Next */
  }
  return doc
}

const price = (name: string, label: string) => ({ name, type: 'number' as const, label, min: 0, admin: { description: 'Vide = « Tarif sur demande » sur le site.' } })

/**
 * Tarifs des professionnels (saisis par Saïd). Lecture publique, écriture administrateur.
 * Tous les prix sont vides par défaut : aucun prix inventé, le site affiche « Tarif sur demande ».
 * Montants en unité de la devise (dinars, euros), pas en centimes.
 */
export const Pricing: GlobalConfig = {
  slug: 'pricing',
  label: 'Tarifs professionnels',
  admin: { group: 'Professionnels' },
  access: { read: anyone, update: isAdmin },
  hooks: { afterChange: [refresh] },
  fields: [
    { name: 'annualFreeMonths', type: 'number', label: 'Mois offerts sur l’abonnement annuel', defaultValue: DEFAULT_ANNUAL_FREE_MONTHS, min: 0, max: 12, admin: { step: 1, description: 'Annuel = 12 mois payés + ces mois offerts.' } },
    {
      name: 'plans',
      type: 'array',
      label: 'Formules',
      labels: { singular: 'Formule', plural: 'Formules' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'code', type: 'select', label: 'Formule', required: true, options: [{ label: 'Pro', value: 'pro' }, { label: 'Premium', value: 'premium' }] },
            { name: 'label', type: 'text', label: 'Nom affiché' },
          ],
        },
        { type: 'row', fields: [price('monthlyDZD', 'Prix mensuel (DA)'), price('monthlyEUR', 'Prix mensuel (€)')] },
        { name: 'features', type: 'text', hasMany: true, label: 'Avantages', admin: { description: 'Une ligne par avantage.' } },
      ],
    },
    { type: 'row', fields: [price('boost7DZD', 'Boost 7 jours (DA)'), price('boost7EUR', 'Boost 7 jours (€)')] },
    { type: 'row', fields: [price('projecteurDZD', 'Projecteur (DA)'), price('projecteurEUR', 'Projecteur (€)')] },
    { type: 'row', fields: [price('leadPack20DZD', 'Pack 20 demandes (DA)'), price('leadPack20EUR', 'Pack 20 demandes (€)')] },
  ],
}
