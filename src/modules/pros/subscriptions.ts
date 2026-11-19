import 'server-only'
import { unstable_cache } from 'next/cache'
import { ActionError } from '@/platform/actions'
import { payload as getPayload } from '@/platform/http'
import { SITE, esc, layout, send } from '@/platform/mail'
import { SUBSCRIPTIONS_TAG } from './subscriptionsCollection'
import { PLAN_LABEL, dueReminders, expiredSubIds, isPlan, planFrom, subscriptionPeriod, type PlanLevel, type SubRow, type SubscriptionPlan } from './subscriptionsCore'

const relId = (v: unknown): number | null => {
  const id = typeof v === 'object' && v ? (v as { id?: unknown }).id : v
  const n = Number(id)
  return Number.isInteger(n) && n > 0 ? n : null
}

/**
 * Active un abonnement (clic d’un administrateur, ou paiement confirmé par le fournisseur) : période calculée selon
 * le plan et `pricing.annualFreeMonths` (un renouvellement commence à la fin de l’abonnement en cours de la même fiche),
 * paiement lié, note ajoutée. Paiement à justifier : un paiement « Reçu » (paymentId ou déjà lié) ou une note.
 * Le hook de la collection vide le cache `subscriptions` et rafraîchit la fiche.
 */
export async function activateSubscription(id: number, opts: { paymentId?: number; note?: string; by: string }): Promise<void> {
  const p = await getPayload()
  const sub = (await p.findByID({ collection: 'subscriptions', id, depth: 0, overrideAccess: true }).catch(() => null)) as (SubRow & { payment?: unknown; note?: string | null }) | null
  if (!sub) throw new ActionError('invalid_input', 'Abonnement introuvable.')
  if (sub.status !== 'en_attente') throw new ActionError('invalid_input', `Cet abonnement est déjà « ${String(sub.status)} ».`)
  if (!isPlan(sub.plan)) throw new ActionError('invalid_input', 'Formule inconnue.')
  const note = (opts.note ?? '').trim().slice(0, 500)
  const paymentId = opts.paymentId ?? relId(sub.payment)
  if (paymentId != null) {
    const pay = (await p.findByID({ collection: 'payments', id: paymentId, depth: 0, overrideAccess: true }).catch(() => null)) as { id: number; status?: string; subscription?: unknown } | null
    if (!pay || pay.status !== 'recu') throw new ActionError('invalid_input', 'Paiement introuvable ou pas encore « Reçu ».')
    const linked = relId(pay.subscription)
    if (linked != null && linked !== id) throw new ActionError('invalid_input', 'Ce paiement est lié à un autre abonnement.')
    if (linked == null) await p.update({ collection: 'payments', id: pay.id, data: { subscription: id, purpose: 'abonnement' }, overrideAccess: true })
  } else if (!note) throw new ActionError('invalid_input', 'Paiement à justifier : paiement « Reçu » (paymentId) ou note de paiement (moyen, montant, référence).')
  const { docs: running } = await p.find({
    collection: 'subscriptions',
    where: { and: [{ targetCollection: { equals: sub.targetCollection } }, { targetId: { equals: String(sub.targetId) } }, { status: { equals: 'active' } }, { id: { not_equals: id } }] },
    sort: '-endsAt',
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const period = subscriptionPeriod(sub.plan as SubscriptionPlan, new Date(), (running[0] as SubRow | undefined)?.endsAt)
  const line = `${new Date().toISOString().slice(0, 10)} — activé par ${opts.by}${note ? ` : ${note}` : ''}`
  await p.update({
    collection: 'subscriptions',
    id,
    data: { status: 'active', ...period, ...(paymentId != null ? { payment: paymentId } : {}), note: [sub.note, line].filter(Boolean).join('\n') },
    overrideAccess: true,
    context: { channel: 'admin' },
  })
}

const memberEmail = async (p: Awaited<ReturnType<typeof getPayload>>, member: unknown) => {
  const id = relId(member)
  if (id == null) return null
  const m = (await p.findByID({ collection: 'members', id, depth: 0, overrideAccess: true }).catch(() => null)) as { email?: string; firstName?: string } | null
  return m?.email ? { email: m.email, firstName: m.firstName ?? '' } : null
}

/**
 * Tâche quotidienne : passe à « expirée » les abonnements finis, puis envoie un rappel unique 7 jours avant la fin
 * (`remindedAt` noté seulement si l’email est accepté : un échec sera retenté le lendemain).
 */
export async function expireSubscriptions(now = new Date()): Promise<{ expirees: number; rappels: number }> {
  const p = await getPayload()
  const { docs } = await p.find({ collection: 'subscriptions', where: { status: { equals: 'active' } }, depth: 0, limit: 2000, pagination: false, overrideAccess: true })
  const list = docs as unknown as (SubRow & { member?: unknown })[]
  let expirees = 0
  for (const id of expiredSubIds(list, now)) {
    await p.update({ collection: 'subscriptions', id, data: { status: 'expiree' }, overrideAccess: true, context: { channel: 'cron' } })
    expirees++
  }
  let rappels = 0
  for (const s of dueReminders(list, now)) {
    const to = await memberEmail(p, s.member)
    if (!to) continue
    const fin = new Date(String(s.endsAt)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Algiers' })
    const ok = await send(
      to.email,
      'Votre abonnement DALIL se termine bientôt',
      layout(
        `Bonjour${to.firstName ? ` ${esc(to.firstName)}` : ''}, votre abonnement se termine le ${esc(fin)}.`,
        `<p>Votre formule ${esc(PLAN_LABEL[s.plan as SubscriptionPlan] ?? s.plan)} prend fin le ${esc(fin)}. Pour la garder sans interruption, renouvelez-la depuis votre espace professionnel.</p><p>Sans renouvellement, votre fiche reste en ligne avec la formule gratuite. Un abonnement n’a aucun effet sur la vérification de votre fiche.</p>`,
        { label: 'Mon espace professionnel', href: `${SITE}/espace-pro` },
      ),
      { idempotencyKey: `abonnement-rappel-${s.id}-${String(s.endsAt).slice(0, 10)}` },
    )
    if (!ok) continue
    await p.update({ collection: 'subscriptions', id: s.id, data: { remindedAt: now.toISOString() }, overrideAccess: true, context: { channel: 'cron' } })
    rappels++
  }
  return { expirees, rappels }
}

const fetchRunning = async (): Promise<SubRow[]> => {
  const p = await getPayload()
  const { docs } = await p.find({ collection: 'subscriptions', where: { status: { equals: 'active' } }, depth: 0, limit: 5000, pagination: false, overrideAccess: true })
  return (docs as unknown as SubRow[]).map((d) => ({ id: d.id, targetCollection: d.targetCollection, targetId: String(d.targetId), plan: d.plan, status: d.status, startsAt: d.startsAt ?? null, endsAt: d.endsAt ?? null }))
}
const cachedRunning = unstable_cache(fetchRunning, ['pros-subscriptions-active'], { tags: [SUBSCRIPTIONS_TAG], revalidate: 300 })

/** Formule d’une fiche (« gratuit », « pro », « premium »), cache par étiquette `subscriptions`. Panne → « gratuit ». */
export async function planOf(targetCollection: string, targetId: string | number): Promise<PlanLevel> {
  let list: SubRow[]
  try {
    list = await cachedRunning()
  } catch {
    try {
      list = await fetchRunning()
    } catch {
      return 'gratuit'
    }
  }
  return planFrom(list, targetCollection, targetId)
}
