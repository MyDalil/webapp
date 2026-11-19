import 'server-only'
import type { ActionContext, ActionDef } from '@/platform/actions/types'
import { ActionError } from '@/platform/actions/run'
import { PROVIDER_NAME, PURPOSE_LABEL, formatAmount, type OnlineProvider, type PaymentPurpose } from './core'
import { paymentDeps } from './server'
import { appendNote, validatePayment } from './settle'

/**
 * Actions « paiements » (admin, MCP, Telegram). À ajouter au registre (`src/registry.ts`) : `...paymentActions`.
 * Bouton Telegram « Confirmer le paiement » : référence `v-<id>` (à déclarer `valider_paiement: 'v'` dans la table CONFIRM
 * de `communication/remote/core.ts`). Règle 4 : aucune action ne touche à la vérification.
 */
type Row = { id: number | string; provider: string; reference?: string | null; amount: number; currency: string; status: string; purpose?: string | null; createdAt?: string }

const view = (d: Row) => ({
  id: d.id,
  moyen: PROVIDER_NAME[d.provider as OnlineProvider] ?? d.provider,
  objet: PURPOSE_LABEL[(d.purpose ?? 'autre') as PaymentPurpose] ?? d.purpose,
  montant: formatAmount(Number(d.amount), d.currency),
  reference: d.reference ?? null,
  statut: d.status,
  creeLe: d.createdAt ?? null,
})

const by = (ctx: ActionContext) => (ctx.principal.kind === 'staff' ? ctx.principal.name : 'l’équipe')

export const paymentActions: ActionDef[] = [
  {
    name: 'paiements_en_attente',
    title: 'Paiements en attente',
    description: 'Liste les paiements « en attente » (reçus BaridiMob, CCP, virement, espèces envoyés par les pros, paiements en ligne non confirmés). Lecture seule.',
    module: 'pros',
    access: 'staff',
    readOnly: true,
    input: { type: 'object', properties: {} },
    run: async () => {
      const p = await paymentDeps().db()
      const { docs } = await p.find({ collection: 'payments', where: { status: { equals: 'en_attente' } }, sort: '-createdAt', limit: 50, depth: 0, overrideAccess: true })
      return { paiements: (docs as unknown as Row[]).map(view) }
    },
  },
  {
    name: 'valider_paiement',
    title: 'Valider un paiement',
    description: 'Confirme un paiement « en attente » après contrôle du justificatif (BaridiMob, CCP, virement, espèces) : passe à « reçu », active l’abonnement ou la mise en avant liée, prévient l’équipe et envoie le reçu au membre. `annuler: true` : passe à « annulé » sans rien activer. Sans effet sur la vérification.',
    module: 'pros',
    access: 'admin',
    readOnly: false,
    input: { type: 'object', required: ['id'], properties: { id: { type: ['integer', 'string'] }, annuler: { type: 'boolean' }, note: { type: 'string', maxLength: 500 }, confirmer: { type: 'boolean' } } },
    run: async (input: { id: number | string; annuler?: boolean; note?: string }, ctx: ActionContext) => {
      const id = Number(input?.id)
      if (!Number.isInteger(id) || id < 1) throw new ActionError('invalid_input', 'Paiement à préciser.')
      if (input.annuler) {
        const p = await paymentDeps().db()
        const pay = await p.findByID({ collection: 'payments', id, depth: 0, overrideAccess: true }).catch(() => null)
        if (!pay) throw new ActionError('not_found', 'Paiement introuvable.')
        if (pay.status !== 'en_attente') throw new ActionError('failed', `Ce paiement est déjà « ${String(pay.status)} ».`)
        const motif = typeof input.note === 'string' ? input.note.trim().slice(0, 500) : ''
        await p.update({ collection: 'payments', id, data: { status: 'annule', note: appendNote(pay.note, `Annulé par ${by(ctx)}${motif ? ` : ${motif}` : ''}.`) }, overrideAccess: true })
        return { summary: `Paiement n° ${id} annulé`, id, statut: 'annule' }
      }
      try {
        return await validatePayment(paymentDeps(), id, by(ctx))
      } catch (e) {
        const msg = (e as Error).message
        if (/introuvable/.test(msg)) throw new ActionError('not_found', msg)
        if (/déjà/.test(msg)) throw new ActionError('failed', msg)
        throw e
      }
    },
  },
]
