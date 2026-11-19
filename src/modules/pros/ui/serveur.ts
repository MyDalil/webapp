import 'server-only'
import type { Member } from '@/payload-types'
import { payload as getPayload } from '@/platform/http'
import { notifyStaff, type NotifyButton } from '@/platform/telegram/notify'
import { confirmRef, signCallback } from '@/platform/telegram/callback'
import { cleanDocument } from '@/platform/storage/images'
import { kitEligible, type KitDoc } from '../kitRules'
import { checkoutProvider, claimBlocker, reusableSubscription, isCurrency, isPeriod, isPlanCode, isReceiptMethod, planPrice, PROOF_LABEL, samePhone, subscriptionPlan, sumMetrics, TARGET_PATH, validateClaim, validatePlaceDraft, type ClaimTarget } from './parcours'
import { verifyFinalizeToken } from '@/modules/communication'
import { saveClaimDocument } from '../claims'
import { createCheckout, submitPaymentReceipt } from '../payments/server'
import { getPricing } from '../pricing'
import { planOf } from '../subscriptions'
import type { Pricing } from './parcours'

/**
 * Parcours pro côté serveur (lot L1) : brouillon d’établissement, revendication, finalisation, abonnement, tableau de bord.
 * Collections du lot K lues sous leurs noms de contrat (subscriptions, claims, claim-documents, leads, metrics-daily).
 * Règle 4 : rien ici n’écrit un champ de `confiance` ; aucune publication (brouillons seulement, décision équipe).
 */
type Doc = Record<string, unknown>
type Loose = {
  find: (a: Doc) => Promise<{ docs: Doc[]; totalDocs: number }>
  findByID: (a: Doc) => Promise<Doc | null>
  create: (a: Doc) => Promise<Doc>
  update: (a: Doc) => Promise<Doc>
}
export type Result<T = Doc> = ({ ok: true } & T) | { error: string; status: number }

const db = async () => (await getPayload()) as unknown as Loose
const fail = (error: string, status = 400) => ({ error, status }) as const
const idOf = (v: unknown) => (v && typeof v === 'object' ? (v as { id?: unknown }).id : v)
const OWNER_FIELD: Record<ClaimTarget, string> = { places: 'owner', practitioners: 'owner', providers: 'owner' }
const PUBLISHED: Record<ClaimTarget, Doc> = { places: { _status: { equals: 'published' } }, practitioners: { status: { equals: 'published' } }, providers: { status: { equals: 'published' } } }
const nameOf = (d: Doc) => String(d.name ?? d.displayName ?? d.title ?? d.id)

/** Boutons signés (op `x`) : références de la table CONFIRM du socle, lues par la télécommande (communication). */
const buttons = (pairs: [string, string | null][]): NotifyButton[][] => [pairs.map(([text, ref]) => ({ text, data: ref ? (signCallback('x', ref) ?? '') : '' })).filter((b) => b.data)]
const claimButtons = (id: unknown) =>
  buttons([
    ['Accepter', confirmRef('decider_revendication', { id, decision: 'acceptee' })],
    ['Refuser', confirmRef('decider_revendication', { id, decision: 'refusee' })],
  ])

/** Un compte particulier devient pro dès qu’il inscrit ou revendique une activité. */
async function ensurePro(member: Member) {
  if (member.kind === 'pro') return
  await (await db()).update({ collection: 'members', id: member.id, data: { kind: 'pro' }, overrideAccess: true, context: { spaceOnly: true } }).catch(() => null)
}

/** « Prénom Nom (email) » du membre, pour les messages à l’équipe. */
const memberLabel = (m: Member) => [[m.firstName, m.lastName].filter(Boolean).join(' '), m.email ? `(${m.email})` : ''].filter(Boolean).join(' ') || `membre n° ${m.id}`

const verified = (m: Member) => Boolean((m as { _verified?: boolean })._verified)

/** Tarifs (global `pricing`, lot K) au format du sélecteur de formule. */
export const readPricing = async (): Promise<Pricing> => (await getPricing()) as Pricing

/* ——— 1. Inscription d’un établissement (fiche lieu en brouillon) ——— */

export async function createPlaceDraft(member: Member, body: Doc | null): Promise<Result<{ id: unknown }>> {
  if (!verified(member)) return fail('Confirmez d’abord votre adresse email.', 403)
  const v = validatePlaceDraft(body)
  if ('error' in v) return fail(v.error)
  const p = await db()
  const dup = await p.find({ collection: 'places', where: { and: [{ owner: { equals: member.id } }, { name: { equals: v.data.name } }] }, draft: true, depth: 0, limit: 1, overrideAccess: true }).catch(() => ({ docs: [] as Doc[] }))
  if (dup.docs.length) return fail('Cette fiche est déjà enregistrée dans votre espace.', 409)
  let created: Doc
  try {
    created = await p.create({
      collection: 'places',
      draft: true,
      overrideAccess: true,
      data: { ...v.data, _status: 'draft', owner: member.id, source: { provider: 'pro' }, contributor: '' },
    })
  } catch {
    return fail('Enregistrement impossible. Réessayez.', 500)
  }
  await ensurePro(member)
  await notifyStaff(`Nouvelle fiche proposée par un professionnel (brouillon) : ${v.data.name}, ${v.data.city} (wilaya ${v.data.wilaya}). À relire dans /admin avant publication.`)
  return { ok: true, id: created.id }
}

/* ——— 3. Revendication ——— */

export async function claimTarget(collection: ClaimTarget, slug: string) {
  const p = await db()
  const { docs } = await p.find({ collection, where: { and: [{ slug: { equals: slug } }, PUBLISHED[collection]] }, depth: 0, limit: 1, overrideAccess: true }).catch(() => ({ docs: [] as Doc[] }))
  const d = docs[0]
  return d ? { id: d.id as number, name: nameOf(d), slug, owner: d[OWNER_FIELD[collection]] ?? null, phone: String(d.phone ?? ''), path: `${TARGET_PATH[collection]}/${slug}` } : null
}

async function pendingClaims(collection: ClaimTarget, id: unknown) {
  const { totalDocs } = await (await db())
    .find({ collection: 'claims', where: { and: [{ targetCollection: { equals: collection } }, { targetId: { equals: String(id) } }, { status: { equals: 'en_attente' } }] }, depth: 0, limit: 1, overrideAccess: true })
    .catch(() => ({ totalDocs: 0 }))
  return totalDocs
}

/** Document privé (claim-documents, lecture admin seulement). */
async function storePrivateDocument(memberId: number, file: Buffer, name: string): Promise<number> {
  const c = cleanDocument(file)
  if ('error' in c) throw new Error(c.error)
  const doc = await saveClaimDocument({ memberId, filename: `${name}.${c.ext}`, mimetype: c.mimetype, bytes: c.data })
  if ('error' in doc) throw new Error(doc.error)
  return doc.id
}

export async function createClaim(member: Member, body: Doc | null, file: Buffer | null): Promise<Result<{ id: unknown }>> {
  if (!verified(member)) return fail('Confirmez d’abord votre adresse email.', 403)
  const v = validateClaim(body, Boolean(file?.length))
  if ('error' in v) return fail(v.error)
  const target = await claimTarget(v.data.targetCollection, v.data.slug)
  if (!target) return fail('Fiche introuvable.', 404)
  const blocked = claimBlocker(target, await pendingClaims(v.data.targetCollection, target.id))
  if (blocked) return fail(blocked, 409)
  let proofFile: unknown = undefined
  if (file?.length) {
    try {
      proofFile = await storePrivateDocument(member.id, file, `revendication-${v.data.targetCollection}-${target.id}`)
    } catch (e) {
      return fail(e instanceof Error ? e.message : 'Justificatif illisible.')
    }
  }
  let created: Doc
  try {
    created = await (await db()).create({
      collection: 'claims',
      overrideAccess: true,
      data: { member: member.id, targetCollection: v.data.targetCollection, targetId: String(target.id), proofType: v.data.proofType, proofText: v.data.proofText, proofFile, status: 'en_attente' },
    })
  } catch {
    return fail('Enregistrement impossible. Réessayez.', 500)
  }
  await ensurePro(member)
  const phoneMatch = v.data.proofType === 'telephone' && samePhone(v.data.proofText, target.phone)
  await notifyStaff(
    `Revendication de ${target.name} (${target.path}) par ${memberLabel(member)} — ${PROOF_LABEL[v.data.proofType]}${v.data.proofText ? ` : ${v.data.proofText}` : ''}${phoneMatch ? ' (identique au téléphone de la fiche)' : ''}${proofFile ? ', justificatif joint' : ''}. À décider dans /admin.`,
    { buttons: claimButtons(created.id) },
  )
  return { ok: true, id: created.id }
}

/* ——— 4. Lien /finaliser (brouillon créé par le bot) ——— */

export function finalizeTarget(token: string) {
  return token ? verifyFinalizeToken(token) : null
}

export async function finalizeDraft(member: Member, token: string): Promise<Result<{ placeId: number; name: string }>> {
  const t = finalizeTarget(token)
  if (!t) return fail('Lien invalide ou expiré. Demandez un nouveau lien à l’équipe DALIL.', 410)
  const p = await db()
  const place = await p.findByID({ collection: 'places', id: t.id, draft: true, depth: 0, overrideAccess: true }).catch(() => null)
  if (!place) return fail('Fiche introuvable.', 404)
  const owner = idOf(place.owner)
  if (owner != null && owner !== member.id) return fail('Cette fiche est déjà rattachée à un autre compte.', 409)
  const mine = await p
    .find({ collection: 'claims', where: { and: [{ targetCollection: { equals: 'places' } }, { targetId: { equals: String(t.id) } }, { member: { equals: member.id } }] }, depth: 0, limit: 1, overrideAccess: true })
    .catch(() => ({ docs: [] as Doc[], totalDocs: 0 }))
  // Aucun rattachement ici : seule l’acceptation de la revendication (decideClaim) écrit `owner`.
  if (owner == null && !mine.docs.length) {
    const phoneMatch = samePhone(member.phone, place.phone)
    let claim: Doc
    try {
      claim = await p.create({ collection: 'claims', overrideAccess: true, data: { member: member.id, targetCollection: 'places', targetId: String(t.id), proofType: phoneMatch ? 'telephone' : 'autre', proofText: phoneMatch ? String(place.phone ?? '') : 'Lien de finalisation envoyé par DALIL', status: 'en_attente' } })
    } catch {
      return fail('Enregistrement impossible. Réessayez.', 500)
    }
    await notifyStaff(`Revendication de ${nameOf(place)} (brouillon n° ${t.id}, lien de finalisation) par ${memberLabel(member)}${phoneMatch ? ' — téléphone identique à la fiche' : ' — téléphone différent, à vérifier'}. À décider.`, { buttons: claimButtons(claim.id) })
  }
  await ensurePro(member)
  return { ok: true, placeId: t.id, name: nameOf(place) }
}

/* ——— 5. Abonnement ——— */

/** Fiches du compte (adresses, praticien, prestataire), brouillons compris. */
export async function myTargets(member: Member): Promise<{ collection: ClaimTarget; id: number; name: string; slug: string; published: boolean; doc: Doc }[]> {
  const p = await db()
  const out: { collection: ClaimTarget; id: number; name: string; slug: string; published: boolean; doc: Doc }[] = []
  for (const collection of ['places', 'practitioners', 'providers'] as const) {
    const { docs } = await p.find({ collection, where: { owner: { equals: member.id } }, ...(collection === 'places' ? { draft: true } : {}), depth: 0, limit: 20, overrideAccess: true }).catch(() => ({ docs: [] as Doc[] }))
    for (const d of docs) out.push({ collection, id: d.id as number, name: nameOf(d), slug: String(d.slug ?? ''), published: collection === 'places' ? d._status === 'published' : d.status === 'published', doc: d })
  }
  return out
}

export async function requestSubscription(member: Member, body: Doc | null, receipt: Buffer | null): Promise<Result<{ id: unknown; url?: string; message: string }>> {
  if (!verified(member)) return fail('Confirmez d’abord votre adresse email.', 403)
  if (!body) return fail('Demande illisible.')
  const { targetCollection, targetId, plan, period, currency, mode } = body
  if (typeof targetCollection !== 'string' || !(['places', 'practitioners', 'providers'] as string[]).includes(targetCollection)) return fail('Fiche à choisir.')
  if (!isPlanCode(plan) || !isPeriod(period) || !isCurrency(currency)) return fail('Formule à choisir.')
  if (mode !== 'en_ligne' && mode !== 'recu' && mode !== 'sur_demande') return fail('Mode de paiement à choisir.')
  const target = (await myTargets(member)).find((t) => t.collection === targetCollection && String(t.id) === String(targetId))
  if (!target) return fail('Cette fiche n’est pas rattachée à votre compte.', 403)
  const p = await db()
  const open = await p
    .find({ collection: 'subscriptions', where: { and: [{ targetCollection: { equals: target.collection } }, { targetId: { equals: String(target.id) } }, { status: { equals: 'en_attente' } }] }, depth: 0, limit: 1, overrideAccess: true })
    .catch(() => ({ docs: [] as Doc[], totalDocs: 0 }))
  const pending = open.docs[0]
  const paid = pending
    ? (await p.find({ collection: 'payments', where: { and: [{ subscription: { equals: pending.id } }, { status: { equals: 'recu' } }] }, depth: 0, limit: 1, overrideAccess: true }).catch(() => ({ docs: [] as Doc[], totalDocs: 0 }))).docs.length
    : 0
  // Abonnement en attente du même membre sans paiement reçu (paiement abandonné, échec) : réutilisé au lieu d’un 409.
  const reuse = reusableSubscription(pending, member.id, paid)
  if (reuse === 'conflit') return fail('Une demande d’abonnement est déjà en attente de validation pour cette fiche.', 409)
  // Prix calculé ici, depuis les tarifs saisis par l’équipe (global `pricing`) : jamais depuis le client.
  const price = planPrice((await getPricing()) as Pricing, plan, period, currency)
  if (price == null && mode !== 'sur_demande') return fail('Tarif sur demande : l’équipe DALIL vous contacte.')
  if (mode === 'recu' && (!isReceiptMethod(body.method) || !String(body.reference ?? '').trim() || !receipt?.length)) return fail('Moyen de paiement, référence et justificatif à fournir.')
  let sub: Doc
  try {
    const data = { plan: subscriptionPlan(plan, period), country: currency === 'EUR' ? 'FR' : 'DZ' }
    sub =
      reuse === 'reutiliser' && pending
        ? await p.update({ collection: 'subscriptions', id: pending.id, overrideAccess: true, data })
        : await p.create({ collection: 'subscriptions', overrideAccess: true, data: { ...data, member: member.id, targetCollection: target.collection, targetId: String(target.id), status: 'en_attente' } })
  } catch {
    return fail('Enregistrement impossible. Réessayez.', 500)
  }
  const label = `${plan === 'premium' ? 'Premium' : 'Pro'} ${period}`
  const staffButtons = buttons([['Activer', confirmRef('activer_abonnement', { id: sub.id })], ['Refuser', confirmRef('refuser_abonnement', { id: sub.id })]])
  if (mode === 'en_ligne' && price != null) {
    const r = await createCheckout({ purpose: 'abonnement', subscriptionId: sub.id as number, amount: { value: price, currency }, memberId: member.id, provider: checkoutProvider(currency) })
    if ('error' in r) {
      // Paiement impossible : l’abonnement ne reste pas bloqué « en attente ».
      await p.update({ collection: 'subscriptions', id: sub.id, data: { status: 'annulee' }, overrideAccess: true }).catch(() => null)
      return fail(r.error, 502)
    }
    return { ok: true, id: sub.id, url: r.url, message: 'Redirection vers le paiement sécurisé…' }
  }
  if (mode === 'recu' && price != null && receipt && isReceiptMethod(body.method)) {
    // Voie unique du reçu : logique du lot L2 (justificatif privé, paiement « en attente », bouton « Confirmer le paiement »).
    const reference = String(body.reference).trim().slice(0, 80)
    const r = await submitPaymentReceipt(member, { provider: body.method, reference, amount: price, currency, purpose: 'abonnement', subscriptionId: sub.id, file: receipt })
    if ('error' in r) {
      await p.update({ collection: 'subscriptions', id: sub.id, data: { status: 'annulee' }, overrideAccess: true }).catch(() => null)
      return fail(r.error, r.status)
    }
    // L’alerte « Reçu de paiement à contrôler » (bouton « Confirmer le paiement » = valider_paiement, qui active l’abonnement) part de L2.
    await p.update({ collection: 'subscriptions', id: sub.id, data: { payment: r.id }, overrideAccess: true }).catch(() => null)
    return { ok: true, id: sub.id, message: 'En attente de validation : l’équipe DALIL contrôle votre reçu et active votre abonnement.' }
  }
  await notifyStaff(`Abonnement ${label} demandé — ${target.name} (tarif sur demande). Contacter ${member.email}.`, { buttons: staffButtons })
  return { ok: true, id: sub.id, message: 'En attente de validation : l’équipe DALIL vous contacte pour le tarif et le paiement.' }
}

/* ——— 6. Tableau de bord de l’espace pro ——— */

export type ProDashboard = {
  targets: { collection: ClaimTarget; id: number; name: string; slug: string; published: boolean; plan: 'gratuit' | 'pro' | 'premium'; verified: boolean }[]
  subscriptions: { id: unknown; plan: string; status: string; startsAt: string | null; endsAt: string | null; target: string }[]
  claims: { id: unknown; status: string; proofType: string; target: string; at: string }[]
  leads: { id: unknown; kind: string; name: string; message: string; at: string; status: string }[] | null
  stats: { views: number; calls: number; whatsapp: number; directions: number } | null
}

export async function proDashboard(member: Member): Promise<ProDashboard> {
  const p = await db()
  const targets = await myTargets(member)
  const names = new Map(targets.map((t) => [`${t.collection}:${t.id}`, t.name]))
  const forTargets = { or: targets.length ? targets.map((t) => ({ and: [{ targetCollection: { equals: t.collection } }, { targetId: { equals: String(t.id) } }] })) : [{ targetId: { equals: '__aucune__' } }] }
  const none = { docs: [] as Doc[], totalDocs: 0 }
  const [subs, claims, leads, metrics] = await Promise.all([
    p.find({ collection: 'subscriptions', where: { member: { equals: member.id } }, sort: '-createdAt', depth: 0, limit: 20, overrideAccess: true }).catch(() => none),
    p.find({ collection: 'claims', where: { member: { equals: member.id } }, sort: '-createdAt', depth: 0, limit: 20, overrideAccess: true }).catch(() => none),
    p.find({ collection: 'leads', where: { and: [forTargets, { status: { not_equals: 'spam' } }] }, sort: '-createdAt', depth: 0, limit: 20, overrideAccess: true }).catch(() => null),
    p.find({ collection: 'metrics-daily', where: { and: [forTargets, { day: { greater_than_equal: new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10) } }] }, depth: 0, limit: 1000, overrideAccess: true }).catch(() => null),
  ])
  const label = (d: Doc) => names.get(`${d.targetCollection}:${d.targetId}`) ?? `${String(d.targetCollection)} n° ${String(d.targetId)}`
  const claimNames = await Promise.all(
    claims.docs.map(async (c) => names.get(`${c.targetCollection}:${c.targetId}`) ?? nameOf((await p.findByID({ collection: String(c.targetCollection), id: c.targetId, depth: 0, overrideAccess: true, ...(c.targetCollection === 'places' ? { draft: true } : {}) }).catch(() => null)) ?? { id: c.targetId })),
  )
  return {
    targets: await Promise.all(targets.map(async (t) => ({ collection: t.collection, id: t.id, name: t.name, slug: t.slug, published: t.published, plan: await planOf(t.collection, String(t.id)), verified: kitEligible(t.collection, t.doc as KitDoc) }))),
    subscriptions: subs.docs.map((s) => ({ id: s.id, plan: String(s.plan ?? ''), status: String(s.status ?? ''), startsAt: (s.startsAt as string) ?? null, endsAt: (s.endsAt as string) ?? null, target: label(s) })),
    claims: claims.docs.map((c, i) => ({ id: c.id, status: String(c.status ?? ''), proofType: String(c.proofType ?? ''), target: claimNames[i], at: String(c.createdAt ?? '') })),
    leads: leads ? leads.docs.map((l) => ({ id: l.id, kind: String(l.kind ?? ''), name: String(l.name ?? ''), message: String(l.message ?? '').slice(0, 280), at: String(l.createdAt ?? ''), status: String(l.status ?? '') })) : null,
    stats: metrics ? sumMetrics(metrics.docs as { views?: number }[]) : null,
  }
}

/* ——— 7. Page pro courte /pro/[slug] ——— */

export type ProPage = {
  collection: ClaimTarget
  slug: string
  name: string
  category: string | null
  city: string | null
  intro: string | null
  phone: string | null
  path: string
  plan: 'gratuit' | 'pro' | 'premium'
  verified: boolean
  catalog: { kind: 'service' | 'annonce'; title: string; href: string }[]
}

/** Établissement publié seulement ; catalogue simple = prestataire et annonces publiées du même compte. */
export async function proPage(slug: string): Promise<ProPage | null> {
  if (!/^[a-z0-9][a-z0-9-]{0,159}$/.test(slug)) return null
  const p = await db()
  for (const collection of ['places', 'practitioners', 'providers'] as const) {
    const { docs } = await p.find({ collection, where: { and: [{ slug: { equals: slug } }, PUBLISHED[collection]] }, depth: 0, limit: 1, overrideAccess: false }).catch(() => ({ docs: [] as Doc[] }))
    const d = docs[0]
    if (!d) continue
    const owner = idOf((await p.findByID({ collection, id: d.id, depth: 0, overrideAccess: true }).catch(() => null))?.owner)
    const catalog: ProPage['catalog'] = []
    if (owner != null) {
      const [prov, ads] = await Promise.all([
        collection === 'providers' ? { docs: [] as Doc[] } : p.find({ collection: 'providers', where: { and: [{ owner: { equals: owner } }, PUBLISHED.providers] }, depth: 0, limit: 5, overrideAccess: true }).catch(() => ({ docs: [] as Doc[] })),
        p.find({ collection: 'classifieds', where: { and: [{ author: { equals: owner } }, { status: { equals: 'published' } }] }, depth: 0, limit: 12, overrideAccess: true }).catch(() => ({ docs: [] as Doc[] })),
      ])
      for (const s of prov.docs) catalog.push({ kind: 'service', title: nameOf(s), href: `/prestataires/${String(s.slug)}` })
      for (const a of ads.docs) catalog.push({ kind: 'annonce', title: nameOf(a), href: `/annonces/${String(a.category ?? 'divers')}/${String(a.slug)}` })
    }
    const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
    return {
      collection,
      slug,
      name: nameOf(d),
      category: text(d.category) ?? text(Array.isArray(d.specialties) ? d.specialties[0] : null),
      city: text(d.city),
      intro: text(d.intro ?? d.bio),
      phone: text(d.phone),
      path: `${TARGET_PATH[collection]}/${slug}`,
      plan: await planOf(collection, String(d.id)),
      verified: kitEligible(collection, d as KitDoc),
      catalog,
    }
  }
  return null
}
