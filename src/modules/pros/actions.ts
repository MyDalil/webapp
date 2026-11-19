import 'server-only'
import type { ActionDef } from '@/platform/actions/types'
import { payload as getPayload } from '@/platform/http'
import { SPONSOR_KIND_LABEL, type SponsorKind } from './sponsoringCore'

/**
 * Actions « mise en avant payante » (site, MCP, Telegram, admin). Règle 4 : aucune ne lit ni n’écrit
 * un statut, un critère ou un label de vérification ; elles ne touchent qu’à la collection `sponsorships`.
 */
const db = getPayload
type Row = { id: number | string; targetCollection: string; targetId: string; kind: string; wilaya?: string | null; startsAt?: string | null; endsAt?: string | null; status: string; paymentNote?: string | null; country?: string | null }

const view = (d: Row) => ({
  id: d.id,
  fiche: `${d.targetCollection}:${d.targetId}`,
  type: SPONSOR_KIND_LABEL[d.kind as SponsorKind] ?? d.kind,
  wilaya: d.wilaya ?? null,
  debut: d.startsAt ?? null,
  fin: d.endsAt ?? null,
  statut: d.status,
  paiement: d.paymentNote ?? null,
  pays: d.country ?? 'DZ',
})

const isDate = (v: unknown) => typeof v === 'string' && !Number.isNaN(Date.parse(v))

export const actions: ActionDef[] = [
  {
    name: 'demandes_sponsoring',
    title: 'Demandes de mise en avant',
    description: 'Liste les demandes de mise en avant payante (« À la une », « Remontée », « Partenaire ») en attente, ou celles d’un statut donné. Lecture seule.',
    module: 'pros',
    access: 'staff',
    readOnly: true,
    input: { type: 'object', properties: { statut: { type: 'string', enum: ['demande', 'active', 'terminee', 'refusee'] } } },
    run: async (input: { statut?: string }) => {
      const p = await db()
      const status = ['demande', 'active', 'terminee', 'refusee'].includes(input?.statut ?? '') ? input.statut : 'demande'
      const { docs } = await p.find({ collection: 'sponsorships', where: { status: { equals: status } }, sort: '-createdAt', limit: 50, depth: 0, overrideAccess: true })
      return { statut: status, demandes: (docs as Row[]).map(view) }
    },
  },
  {
    name: 'activer_sponsoring',
    title: 'Activer une mise en avant',
    description: 'Active une demande de mise en avant après paiement : soit un paiement « Reçu » enregistré dans /admin (paiementId), soit une note de paiement hors ligne (BaridiMob, CCP, CIB, espèces : moyen, montant, référence). Sans effet sur la vérification.',
    module: 'pros',
    access: 'admin',
    readOnly: false,
    input: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: ['integer', 'string'] },
        paiementId: { type: ['integer', 'string'], description: 'Paiement « Reçu » de la collection Paiements, lié à cette demande.' },
        paymentNote: { type: 'string', description: 'Moyen, montant, référence, date (si aucun paiement enregistré).' },
        startsAt: { type: 'string', format: 'date-time' },
        endsAt: { type: 'string', format: 'date-time' },
      },
    },
    run: async (input: { id: number | string; paiementId?: number | string; paymentNote?: string; startsAt?: string; endsAt?: string }) => {
      const note = typeof input?.paymentNote === 'string' ? input.paymentNote.trim().slice(0, 500) : ''
      if (!note && input?.paiementId == null) throw new Error('Paiement à justifier : paiement « Reçu » enregistré (paiementId) ou note de paiement (moyen, montant, référence).')
      const p = await db()
      const doc = (await p.findByID({ collection: 'sponsorships', id: input.id, depth: 0, overrideAccess: true }).catch(() => null)) as Row | null
      if (!doc) throw new Error('Demande introuvable.')
      if (doc.status !== 'demande') throw new Error(`Cette demande est déjà « ${String(doc.status)} ».`)
      const startsAt = isDate(input.startsAt) ? input.startsAt : (doc.startsAt ?? undefined)
      const endsAt = isDate(input.endsAt) ? input.endsAt : (doc.endsAt ?? undefined)
      if (!startsAt || !endsAt || Date.parse(endsAt) <= Date.parse(startsAt)) throw new Error('Dates de début et de fin à préciser (fin après le début).')
      if (input.paiementId != null) {
        const pay = await p.findByID({ collection: 'payments', id: input.paiementId, depth: 0, overrideAccess: true }).catch(() => null)
        if (!pay || pay.status !== 'recu') throw new Error('Paiement introuvable ou pas encore « Reçu ».')
        const linked = typeof pay.sponsorship === 'object' && pay.sponsorship ? pay.sponsorship.id : pay.sponsorship
        if (linked != null && String(linked) !== String(doc.id)) throw new Error('Ce paiement est lié à une autre mise en avant.')
        if (linked == null) await p.update({ collection: 'payments', id: pay.id, data: { sponsorship: Number(doc.id) }, overrideAccess: true })
      }
      const updated = (await p.update({ collection: 'sponsorships', id: input.id, data: { status: 'active', ...(note ? { paymentNote: note } : {}), startsAt, endsAt }, overrideAccess: true })) as Row
      return view(updated)
    },
  },
  {
    name: 'refuser_sponsoring',
    title: 'Refuser une mise en avant',
    description: 'Refuse une demande de mise en avant (paiement non reçu, fiche hors sujet…). Sans effet sur la vérification.',
    module: 'pros',
    access: 'admin',
    readOnly: false,
    input: { type: 'object', required: ['id'], properties: { id: { type: ['integer', 'string'] }, motif: { type: 'string' } } },
    run: async (input: { id: number | string; motif?: string }) => {
      const p = await db()
      const doc = (await p.findByID({ collection: 'sponsorships', id: input.id, depth: 0, overrideAccess: true }).catch(() => null)) as Row | null
      if (!doc) throw new Error('Demande introuvable.')
      if (doc.status !== 'demande') throw new Error(`Cette demande est déjà « ${String(doc.status)} ».`)
      const motif = typeof input.motif === 'string' ? input.motif.trim().slice(0, 300) : ''
      const updated = (await p.update({ collection: 'sponsorships', id: input.id, data: { status: 'refusee', ...(motif ? { paymentNote: [doc.paymentNote, `Refus : ${motif}`].filter(Boolean).join('\n') } : {}) }, overrideAccess: true })) as Row
      return view(updated)
    },
  },
]
