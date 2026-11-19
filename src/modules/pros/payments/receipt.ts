import { cleanDocument } from '@/platform/storage/images'
import { MANUAL_PROVIDERS, PAYMENT_PURPOSES, PROVIDER_NAME, PURPOSE_LABEL, confirmPaymentRef, formatAmount, toCents, type ManualProvider, type PaymentPurpose } from './core'
import { relId, type Deps } from './deps'

/**
 * Reçu de paiement hors ligne (BaridiMob, CCP, virement, espèces) envoyé par un membre connecté :
 * justificatif privé + référence → paiement « en attente » ; l’équipe confirme (bouton Telegram signé ou /admin)
 * par l’action `valider_paiement`. Rien n’est activé sans ce clic.
 */
export type ReceiptInput = { provider: string; reference: string; amount: unknown; currency: string; purpose: string; subscriptionId?: unknown; sponsorshipId?: unknown; file: Buffer | null }
export type ReceiptResult = { ok: true; id: number } | { error: string; status: number }

/** Plafond du justificatif annoncé : 5 Mo ; le contrôle commun des pièces (4 Mo, limite de corps de Vercel) s’applique d’abord. */
export const MAX_PROOF_BYTES = 5 * 1024 * 1024

const intOrNull = (v: unknown) => {
  if (v == null || v === '') return null
  const n = typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v
  return typeof n === 'number' && Number.isInteger(n) && n > 0 ? n : NaN
}

export async function submitReceiptWith(deps: Deps, member: { id: number; email?: string | null; firstName?: string | null; lastName?: string | null }, input: ReceiptInput): Promise<ReceiptResult> {
  const provider = input.provider as ManualProvider
  if (!MANUAL_PROVIDERS.includes(provider)) return { error: 'Moyen de paiement : BaridiMob, CCP, virement ou espèces.', status: 400 }
  const purpose = input.purpose as PaymentPurpose
  if (!PAYMENT_PURPOSES.includes(purpose)) return { error: 'Objet du paiement inconnu.', status: 400 }
  const reference = input.reference.trim().replace(/\s+/g, ' ').slice(0, 120)
  if (reference.length < 2) return { error: 'Indiquez la référence du paiement (numéro de transaction ou de reçu).', status: 400 }
  const currency = input.currency === 'EUR' ? 'EUR' : input.currency === 'DZD' || !input.currency ? 'DZD' : null
  if (!currency) return { error: 'Devise : DZD ou EUR.', status: 400 }
  const value = typeof input.amount === 'string' ? Number(input.amount.replace(',', '.').replace(/\s/g, '')) : input.amount
  const cents = toCents(value, currency)
  if (cents == null) return { error: 'Montant invalide.', status: 400 }
  const subscriptionId = intOrNull(input.subscriptionId)
  const sponsorshipId = intOrNull(input.sponsorshipId)
  if (Number.isNaN(subscriptionId) || Number.isNaN(sponsorshipId)) return { error: 'Référence d’abonnement ou de mise en avant invalide.', status: 400 }
  if (!input.file) return { error: 'Joignez le justificatif (photo ou PDF).', status: 400 }
  if (input.file.length > MAX_PROOF_BYTES) return { error: 'Justificatif trop lourd (5 Mo maximum).', status: 400 }
  const clean = cleanDocument(input.file)
  if ('error' in clean) return { error: clean.error, status: 400 }
  if (clean.mimetype === 'image/webp') return { error: 'Format accepté : PDF, JPG ou PNG.', status: 400 }

  const p = await deps.db()
  if (subscriptionId) {
    const s = await p.findByID({ collection: 'subscriptions', id: subscriptionId, depth: 0, overrideAccess: true }).catch(() => null)
    if (!s || relId(s.member) !== member.id) return { error: 'Abonnement introuvable.', status: 404 }
  }
  if (sponsorshipId) {
    const s = await p.findByID({ collection: 'sponsorships', id: sponsorshipId, depth: 0, overrideAccess: true }).catch(() => null)
    if (!s || relId(s.requestedBy) !== member.id) return { error: 'Mise en avant introuvable.', status: 404 }
  }
  const dup = await p.find({ collection: 'payments', where: { and: [{ member: { equals: member.id } }, { provider: { equals: provider } }, { reference: { equals: reference } }, { status: { in: ['en_attente', 'recu'] } }] }, depth: 0, limit: 1, overrideAccess: true })
  if (dup.docs.length) return { error: 'Ce reçu a déjà été envoyé.', status: 409 }

  // Justificatif : document privé (collection `claim-documents` du lot K : lecture administrateur seulement, jamais public).
  let docId: number | null = null
  try {
    const doc = await deps.saveDocument({ memberId: member.id, filename: `recu-paiement-${member.id}-${Date.now()}.${clean.ext}`, mimetype: clean.mimetype, bytes: clean.data })
    if ('error' in doc) return { error: doc.error, status: 400 }
    docId = Number(doc.id)
  } catch {
    return { error: 'Enregistrement du justificatif impossible. Réessayez.', status: 500 }
  }
  const payment = await p.create({
    collection: 'payments',
    data: {
      provider,
      reference,
      amount: cents,
      currency,
      status: 'en_attente',
      purpose,
      member: member.id,
      ...(subscriptionId ? { subscription: subscriptionId } : {}),
      ...(sponsorshipId ? { sponsorship: sponsorshipId } : {}),
      proofFile: docId,
      note: `Reçu déclaré par le membre. Justificatif privé : document n° ${docId} (Documents de revendication, lecture administrateur).`,
    },
    overrideAccess: true,
  })
  const id = Number(payment.id)
  const who = [member.firstName, member.lastName].filter(Boolean).join(' ') || `membre n° ${member.id}`
  const button = deps.sign(confirmPaymentRef(id))
  await deps.notify(
    `Reçu de paiement à contrôler — ${PURPOSE_LABEL[purpose]} : ${formatAmount(cents, currency)} par ${PROVIDER_NAME[provider]}, réf. ${reference}, de ${who}. Paiement n° ${id}, justificatif n° ${docId}.\nContrôler : ${deps.site}/admin/collections/payments/${id}`,
    button ? { buttons: [[{ text: 'Confirmer le paiement', data: button }]] } : undefined,
  )
  return { ok: true, id }
}
