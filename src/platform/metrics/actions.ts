import 'server-only'
import type { ActionDef } from '@/platform/actions/types'
import { ActionError } from '@/platform/actions/run'
import { payload } from '@/platform/http'
import { METRIC_COLLECTIONS, isMetricCollection, isMetricId, visibilityText } from './core'
import { metricsTotals } from './index'

/** Nom affiché de la fiche (champ propre à chaque collection). */
async function nameOf(collection: string, id: string): Promise<string> {
  const p = await payload()
  const doc = (await p.findByID({ collection: collection as 'places', id: Number(id), depth: 0, overrideAccess: true, disableErrors: true })) as Record<string, unknown> | null
  if (!doc) throw new ActionError('not_found', 'Fiche introuvable.')
  return String(doc.name ?? doc.displayName ?? `Fiche ${id}`)
}

const rapportVisibilite: ActionDef<{ collection: string; id: string | number; jours?: number }> = {
  name: 'rapport_visibilite',
  title: 'Rapport de visibilité d’une fiche',
  description:
    'Pour l’équipe : texte prêt à envoyer au professionnel (vues, appels, WhatsApp, itinéraires, demandes reçues) sur les N derniers jours (30 par défaut). Rien n’est envoyé automatiquement : l’équipe copie le texte.',
  module: 'pilotage',
  access: 'staff',
  readOnly: true,
  input: {
    type: 'object',
    properties: {
      collection: { type: 'string', enum: [...METRIC_COLLECTIONS], description: 'places (adresse), practitioners (praticien) ou providers (prestataire).' },
      id: { type: ['string', 'integer'], description: 'Identifiant numérique de la fiche.' },
      jours: { type: 'integer', minimum: 1, maximum: 366, description: 'Période en jours (30 par défaut).' },
    },
    required: ['collection', 'id'],
  },
  async run(input) {
    const id = String(input.id)
    if (!isMetricCollection(input.collection) || !isMetricId(id)) throw new ActionError('invalid_input', 'Fiche inconnue : collection places, practitioners ou providers et identifiant numérique.')
    const days = Math.max(1, Math.min(366, Math.floor(input.jours ?? 30)))
    const [name, totals] = await Promise.all([nameOf(input.collection, id), metricsTotals({ collection: input.collection, id }, days)])
    return { fiche: name, jours: days, totaux: totals, texte: visibilityText(name, totals, days) }
  },
}

/** À ajouter au registre des actions par le coordinateur. */
export const metricsActions: ActionDef[] = [rapportVisibilite]
