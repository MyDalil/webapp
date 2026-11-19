import 'server-only'
import type { ActionContext, ActionDef } from '@/platform/actions/types'
import { ActionError } from '@/platform/actions'
import { payload as getPayload } from '@/platform/http'
import { decideClaim } from './claims'
import { activateSubscription } from './subscriptions'

const by = (ctx: ActionContext) => (ctx.principal.kind === 'staff' ? ctx.principal.name : 'Système')
const note = (v: unknown, n = 500) => (typeof v === 'string' ? v.trim().slice(0, n) : '')

/**
 * Actions d’administration des abonnements, revendications et paiements (vue Validation de /admin, MCP admin,
 * Telegram après clic signé). Règle 4 : aucune ne touche à la vérification.
 */
export const subscriptionActions: ActionDef[] = [
  {
    name: 'activer_abonnement',
    title: 'Activer un abonnement',
    description: 'Administrateur : active un abonnement « en attente » après paiement (paiement « Reçu » lié ou note : moyen, montant, référence). Fin calculée selon la formule. Sans effet sur la vérification.',
    module: 'pros',
    access: 'admin',
    readOnly: false,
    input: { type: 'object', required: ['id'], properties: { id: { type: 'integer', minimum: 1 }, paiementId: { type: 'integer', minimum: 1 }, note: { type: 'string', maxLength: 500 } } },
    async run(input: { id: number; paiementId?: number; note?: string }, ctx) {
      await activateSubscription(input.id, { paymentId: input.paiementId, note: note(input.note), by: by(ctx) })
      return { summary: `Abonnement n° ${input.id} activé`, id: input.id, statut: 'active' }
    },
  },
  {
    name: 'refuser_abonnement',
    title: 'Annuler un abonnement en attente',
    description: 'Administrateur : annule un abonnement « en attente » (paiement jamais reçu, doublon…).',
    module: 'pros',
    access: 'admin',
    readOnly: false,
    input: { type: 'object', required: ['id'], properties: { id: { type: 'integer', minimum: 1 }, motif: { type: 'string', maxLength: 500 } } },
    async run(input: { id: number; motif?: string }, ctx) {
      const p = await getPayload()
      const sub = (await p.findByID({ collection: 'subscriptions', id: input.id, depth: 0, overrideAccess: true }).catch(() => null)) as { status?: string; note?: string | null } | null
      if (!sub) throw new ActionError('invalid_input', 'Abonnement introuvable.')
      if (sub.status !== 'en_attente') throw new ActionError('invalid_input', `Cet abonnement est déjà « ${String(sub.status)} ».`)
      const line = `${new Date().toISOString().slice(0, 10)} — annulé par ${by(ctx)}${note(input.motif) ? ` : ${note(input.motif)}` : ''}`
      await p.update({ collection: 'subscriptions', id: input.id, data: { status: 'annulee', note: [sub.note, line].filter(Boolean).join('\n') }, overrideAccess: true })
      return { summary: `Abonnement n° ${input.id} annulé`, id: input.id, statut: 'annulee' }
    },
  },
  {
    name: 'decider_revendication',
    title: 'Décider une revendication',
    description: 'Administrateur : accepte (la fiche est rattachée au compte du membre, prévenu par email) ou refuse une revendication de fiche. Une fiche déjà rattachée à un autre compte est refusée. Sans effet sur la vérification.',
    module: 'pros',
    access: 'admin',
    readOnly: false,
    input: { type: 'object', required: ['id', 'decision'], properties: { id: { type: 'integer', minimum: 1 }, decision: { type: 'string', enum: ['acceptee', 'refusee'] }, note: { type: 'string', maxLength: 1000 } } },
    async run(input: { id: number; decision: 'acceptee' | 'refusee'; note?: string }, ctx) {
      return decideClaim(input.id, input.decision, note(input.note, 1000), by(ctx))
    },
  },
  // Paiements : une seule action de confirmation, `valider_paiement` (payments/actions.ts) — elle active aussi l’abonnement lié.
]
