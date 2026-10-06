import type { Tab } from 'payload'
import type { Place } from '@/payload-types'
import { SECTORS } from '@/platform/referentiel/catalog'

/**
 * Moteur de confiance DALIL : statuts, critères, sources et date de vérification.
 * Ce module définit le vocabulaire de la vérification ; il ne dépend d’aucun revenu commercial.
 */

export const PLACE_STATUS = [
  { label: 'Repérée — à vérifier', value: 'spotted' },
  { label: 'En cours de vérification', value: 'checking' },
  { label: 'Vérifiée par DALIL', value: 'verified' },
  { label: 'Labellisée Excellence', value: 'labelled' },
] as const

export const CRITERION_RESULTS = [
  { label: 'À confirmer', value: 'pending' },
  { label: 'Conforme', value: 'ok' },
  { label: 'Partiel', value: 'partial' },
  { label: 'Non conforme', value: 'ko' },
  { label: 'Non concerné', value: 'na' },
] as const

export const STATUS_LABEL: Record<NonNullable<Place['verification']>, string> = {
  spotted: 'À vérifier',
  checking: 'En vérification',
  verified: 'Vérifiée',
  labelled: 'Label Excellence',
}

export const RESULT_LABEL: Record<string, string> = {
  pending: 'À confirmer',
  ok: 'Conforme',
  partial: 'Partiel',
  ko: 'Non conforme',
  na: 'Non concerné',
}

/** Critères du secteur, à confirmer, pré-remplis à la création d’une fiche. */
export const criteriaFor = (sector: string) =>
  (SECTORS.find((s) => s.slug === sector)?.criteria ?? []).map((criterion) => ({ criterion, result: 'pending' as const }))

/** Onglet « Vérification » commun à toute entité vérifiable (aujourd’hui : les adresses). */
export const verificationTab: Tab = {
  label: 'Vérification',
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'verification', type: 'select', label: 'Statut DALIL', required: true, defaultValue: 'spotted', options: [...PLACE_STATUS] },
        { name: 'verifiedAt', type: 'date', label: 'Dernière vérification', admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMMM yyyy' } } },
        { name: 'verifiedBy', type: 'text', label: 'Vérifiée par' },
      ],
    },
    {
      name: 'criteria',
      type: 'array',
      label: 'Critères DALIL',
      labels: { singular: 'Critère', plural: 'Critères' },
      admin: { description: 'Pré-remplis selon le secteur. Mettez à jour après chaque visite.' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'criterion', type: 'text', label: 'Critère', required: true },
            { name: 'result', type: 'select', label: 'Résultat', required: true, defaultValue: 'pending', options: [...CRITERION_RESULTS] },
            { name: 'note', type: 'text', label: 'Précision' },
          ],
        },
      ],
    },
    {
      name: 'sources',
      type: 'array',
      label: 'Sources',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'label', type: 'text', label: 'Libellé' },
            { name: 'url', type: 'text', label: 'Lien', required: true },
          ],
        },
      ],
    },
    { name: 'internalNote', type: 'textarea', label: 'Note interne (jamais publiée)' },
  ],
}
