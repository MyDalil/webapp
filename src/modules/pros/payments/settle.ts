import { layout, esc } from '@/platform/mail'
import { PROVIDER_NAME, PURPOSE_LABEL, amountMatches, formatAmount, type OnlineProvider, type PaymentPurpose, type ProviderEvent } from './core'
import { relId, type Deps, type Doc } from './deps'

/**
 * Règlement d’un paiement : passage à « reçu », puis activation selon `purpose`
 * (abonnement → activateSubscription ; boost / projecteur → mise en avant liée), alerte équipe, reçu au membre.
 * Règle 4 : rien ici ne touche à la vérification (`confiance`).
 */
export type Settled = { status: number; body: Record<string, unknown> }

const purposeOf = (p: Doc) => (typeof p.purpose === 'string' && p.purpose in PURPOSE_LABEL ? (p.purpose as PaymentPurpose) : 'autre')

/** Activation, alerte et reçu d’un paiement déjà passé à « reçu ». Une activation en échec est signalée, jamais perdue. */
export async function fulfil(deps: Deps, payment: Doc, by: string): Promise<{ activated: boolean; detail: string }> {
  const purpose = purposeOf(payment)
  const id = Number(payment.id)
  const amount = formatAmount(Number(payment.amount), String(payment.currency))
  let activated = false
  let detail = 'Aucune activation automatique : à traiter dans /admin.'
  try {
    const sub = relId(payment.subscription)
    const spon = relId(payment.sponsorship)
    if (purpose === 'abonnement' && sub) {
      await deps.activateSubscription(sub, { paymentId: id, by, note: `Paiement n° ${id} (${amount})` })
      activated = true
      detail = `Abonnement n° ${sub} activé.`
    } else if ((purpose === 'boost' || purpose === 'projecteur') && spon) {
      await deps.activateSponsorship(spon, id)
      activated = true
      detail = `Mise en avant n° ${spon} activée.`
    }
  } catch (e) {
    detail = `Activation à faire à la main : ${(e as Error).message?.slice(0, 200) || 'erreur'}.`
  }
  await deps.notify(`Paiement reçu — ${PURPOSE_LABEL[purpose]} : ${amount} (${PROVIDER_NAME[payment.provider as OnlineProvider] ?? String(payment.provider)}), paiement n° ${id}, confirmé par ${by}. ${detail}\n${deps.site}/admin/collections/payments/${id}`)
  await sendReceipt(deps, payment, activated)
  return { activated, detail }
}

/** Email de reçu au membre (une seule fois par paiement). */
async function sendReceipt(deps: Deps, payment: Doc, activated: boolean) {
  const memberId = relId(payment.member)
  if (!memberId) return
  try {
    const p = await deps.db()
    const m = await p.findByID({ collection: 'members', id: memberId, depth: 0, overrideAccess: true }).catch(() => null)
    const email = typeof m?.email === 'string' ? m.email : null
    if (!email) return
    const purpose = purposeOf(payment)
    const body = [
      `<p>Bonjour ${esc(m?.firstName ?? '')},</p>`,
      `<p>Nous avons bien reçu votre paiement de <strong>${esc(formatAmount(Number(payment.amount), String(payment.currency)))}</strong> (${esc(PURPOSE_LABEL[purpose])}).</p>`,
      `<p>Référence DALIL : <strong>P-${esc(payment.id)}</strong>${payment.reference ? ` — référence du paiement : ${esc(payment.reference)}` : ''}.</p>`,
      `<p>${activated ? 'Votre formule est active.' : 'L’équipe DALIL active votre formule et vous prévient.'}</p>`,
      '<p>Rappel : un abonnement ou une mise en avant n’achète jamais le label « Vérifié ». La vérification reste indépendante.</p>',
    ].join('')
    await deps.mail(email, 'Paiement reçu — DALIL', layout('Paiement reçu', body, { label: 'Mon espace pro', href: `${deps.site}/espace-pro` }), { idempotencyKey: `paiement-recu-${payment.id}` })
  } catch {
    // Un reçu non envoyé ne bloque jamais le paiement (suivi dans /admin › Emails envoyés).
  }
}

/** Traite un évènement signé d’un fournisseur. Toujours 200 pour un évènement inconnu, ignoré ou déjà traité. */
export async function settleEvent(deps: Deps, provider: OnlineProvider, ev: ProviderEvent): Promise<Settled> {
  if (ev.kind === 'ignored') return { status: 200, body: { ok: true, ignore: ev.type || 'inconnu' } }
  const p = await deps.db()
  const { docs } = await p.find({ collection: 'payments', where: { and: [{ externalId: { equals: ev.externalId } }, { provider: { equals: provider } }] }, depth: 0, limit: 1, overrideAccess: true })
  let payment = docs[0] ?? (await byPaymentId(deps, provider, ev))
  if (!payment) {
    // Webhook arrivé avant l’enregistrement de `externalId` : 503 pendant 10 minutes, le fournisseur renvoie l’évènement.
    const age = ev.createdAt != null ? deps.now().getTime() - ev.createdAt : Infinity
    if (age < UNKNOWN_RETRY_MS) return { status: 503, body: { error: 'Paiement pas encore enregistré, réessayez.' } }
    console.warn('[paiement] évènement pour un paiement inconnu', provider)
    await deps.notify(`Alerte paiement : évènement ${PROVIDER_NAME[provider]} ${ev.kind === 'paid' ? 'payé' : 'échoué'} (${ev.externalId}${ev.paymentId ? `, P-${ev.paymentId}` : ''}) sans paiement DALIL correspondant. À contrôler chez le fournisseur.`)
    return { status: 200, body: { ok: true, ignore: 'paiement inconnu' } }
  }
  if (!payment.externalId) payment = { ...payment, ...(await p.update({ collection: 'payments', id: Number(payment.id), data: { externalId: ev.externalId }, overrideAccess: true })) }
  const id = Number(payment.id)
  if (payment.status !== 'en_attente') return { status: 200, body: { ok: true, deja: payment.status } }

  if (ev.kind === 'failed') {
    await p.update({ collection: 'payments', id, data: { status: 'annule', note: appendNote(payment.note, `${PROVIDER_NAME[provider]} : ${ev.reason}`) }, overrideAccess: true })
    await cancelPendingSubscription(deps, payment)
    return { status: 200, body: { ok: true, statut: 'annule' } }
  }

  if (!amountMatches({ amount: Number(payment.amount), currency: String(payment.currency) }, ev, provider)) {
    const note = `Montant ou devise différents : reçu ${ev.amount} ${ev.currency} (${provider}), attendu ${formatAmount(Number(payment.amount), String(payment.currency))}. Non activé.`
    await p.update({ collection: 'payments', id, data: { note: appendNote(payment.note, note) }, overrideAccess: true })
    await deps.notify(`Alerte paiement n° ${id} : ${note}\n${deps.site}/admin/collections/payments/${id}`)
    return { status: 200, body: { ok: true, ignore: 'montant' } }
  }

  // Livraisons simultanées du même évènement : une seule passe.
  const key = `${provider}:${ev.externalId}`
  if (!(await deps.lock(key))) return { status: 200, body: { ok: true, deja: 'en cours' } }
  try {
    const updated = await p.update({
      collection: 'payments',
      id,
      data: { status: 'recu', paidAt: deps.now().toISOString(), reference: payment.reference || ev.externalId, note: appendNote(payment.note, `Confirmé par ${PROVIDER_NAME[provider]} (évènement ${ev.eventId || '—'}).`) },
      overrideAccess: true,
    })
    await fulfil(deps, { ...payment, ...updated }, PROVIDER_NAME[provider])
    return { status: 200, body: { ok: true, statut: 'recu' } }
  } catch (e) {
    await deps.unlock(key)
    throw e
  }
}

/** Délai pendant lequel un évènement sans paiement connu est refusé en 503 (le fournisseur le renvoie). */
export const UNKNOWN_RETRY_MS = 10 * 60 * 1000

/** Paiement retrouvé par la métadonnée `payment_id` : même fournisseur, sans autre `externalId`. */
async function byPaymentId(deps: Deps, provider: OnlineProvider, ev: { paymentId?: string; externalId: string }): Promise<Doc | null> {
  if (!ev.paymentId) return null
  const p = await deps.db()
  const doc = await p.findByID({ collection: 'payments', id: Number(ev.paymentId), depth: 0, overrideAccess: true }).catch(() => null)
  if (!doc || doc.provider !== provider) return null
  return !doc.externalId || doc.externalId === ev.externalId ? doc : null
}

/**
 * Paiement annulé, expiré ou échoué : l’abonnement lié encore « en attente » passe à « annulée »,
 * sauf si un autre paiement de cet abonnement est en attente ou reçu.
 */
export async function cancelPendingSubscription(deps: Deps, payment: Doc): Promise<void> {
  const subId = relId(payment.subscription)
  if (!subId) return
  const p = await deps.db()
  const sub = await p.findByID({ collection: 'subscriptions', id: subId, depth: 0, overrideAccess: true }).catch(() => null)
  if (!sub || sub.status !== 'en_attente') return
  const { docs } = await p.find({ collection: 'payments', where: { and: [{ subscription: { equals: subId } }, { status: { in: ['en_attente', 'recu'] } }] }, depth: 0, limit: 10, overrideAccess: true })
  if (docs.some((d) => String(d.id) !== String(payment.id))) return
  await p.update({ collection: 'subscriptions', id: subId, data: { status: 'annulee' }, overrideAccess: true })
}

/** Confirmation par l’équipe (reçu hors ligne contrôlé) : « en attente » → « reçu », puis activation, alerte et reçu. */
export async function validatePayment(deps: Deps, id: number, by: string): Promise<{ id: number; statut: string; activation: string }> {
  const p = await deps.db()
  const payment = await p.findByID({ collection: 'payments', id, depth: 0, overrideAccess: true }).catch(() => null)
  if (!payment) throw new Error('Paiement introuvable.')
  if (payment.status !== 'en_attente') throw new Error(`Ce paiement est déjà « ${String(payment.status)} ».`)
  const key = `valider:${id}`
  if (!(await deps.lock(key))) throw new Error('Validation déjà en cours.')
  try {
    const updated = await p.update({ collection: 'payments', id, data: { status: 'recu', paidAt: deps.now().toISOString(), note: appendNote(payment.note, `Confirmé par ${by}.`) }, overrideAccess: true })
    const r = await fulfil(deps, { ...payment, ...updated }, by)
    return { id, statut: 'recu', activation: r.detail }
  } catch (e) {
    await deps.unlock(key)
    throw e
  }
}

export const appendNote =(prev: unknown, line: string) => [typeof prev === 'string' ? prev.trim() : '', line].filter(Boolean).join('\n').slice(0, 4000)
