import 'server-only'
import type { Payload, Where } from 'payload'
import type { Media, Member, Mission, Provider } from '@/payload-types'
import { currentMember } from '@/modules/membres'
import { payload as getPayload } from '@/platform/http'
import { commune as communeOf, communeName } from '@/platform/referentiel/communes'
import { cleanDocument, cleanImage } from '@/platform/storage/images'
import { savePublicPhoto } from '@/platform/storage/upload'
import { activity as activityOf, activityLabel, categoryLabel, priceLabel } from './activities'
import { missionCancelled, missionReminder, newMessage, requestAccepted, requestDeclined, requestSent, requestToProvider, reviewInvite, type MissionMail } from './emails'
import { algiersDate, isRequestable, openDays, type Busy } from './planning'

export type ServiceError = { error: string; status: number }
const fail = (error: string, status = 400): ServiceError => ({ error, status })
export { currentMember }

const RESPONSE_HOURS = 24
const MAX_OPEN_REQUESTS = 5
const AUTO_COMPLETE_HOURS = 48
const REVIEW_WINDOW_DAYS = 60

const photoUrl = (m: number | Media | null | undefined) => (m && typeof m === 'object' ? (m.sizes?.thumb?.url ?? m.url ?? null) : null)
const shortName = (m: Pick<Member, 'firstName' | 'lastName'>) => `${m.firstName} ${(m.lastName ?? '').charAt(0).toUpperCase()}.`.trim()
const idOf = (v: unknown) => (v && typeof v === 'object' ? (v as { id: number }).id : (v as number))
const money = (n: number) => `${new Intl.NumberFormat('fr-FR').format(Math.round(n))} DA`

export type Offer = { activity: string; pricing: 'hour' | 'flat'; price: number | null; unit: string | null; hours: number }
const offersOf = (p: Provider): Offer[] =>
  (p.offers ?? []).map((o) => ({ activity: o.activity, pricing: (o.pricing ?? 'hour') as 'hour' | 'flat', price: o.price ?? null, unit: o.unit ?? null, hours: o.hours ?? 2 }))

export type ProviderCard = {
  slug: string
  name: string
  photo: string | null
  gender: string | null
  categories: string[]
  offers: (Offer & { label: string; priceLabel: string })[]
  wilaya: string
  baseCommune: string | null
  languages: string[]
  clientele: string
  rating: number | null
  reviews: number
  missionsDone: number
  experienceYears: number | null
  checks: { identity: boolean; legal: boolean; background: boolean }
  demo: boolean
}

export const toCard = (p: Provider): ProviderCard => ({
  slug: p.slug ?? String(p.id),
  name: p.displayName,
  photo: photoUrl(p.photo),
  gender: p.gender ?? null,
  categories: (p.categories ?? []) as string[],
  offers: offersOf(p).map((o) => ({ ...o, label: activityLabel(o.activity), priceLabel: priceLabel(o) })),
  wilaya: p.wilaya,
  baseCommune: communeName(p.baseCommune),
  languages: (p.languages ?? []) as string[],
  clientele: p.clientele ?? 'all',
  rating: p.ratingAvg ?? null,
  reviews: p.ratingCount ?? 0,
  missionsDone: p.missionsDone ?? 0,
  experienceYears: p.experienceYears ?? null,
  checks: { identity: Boolean(p.identityVerified), legal: Boolean(p.legalVerified), background: Boolean(p.backgroundCheckedAt) },
  demo: Boolean(p.demo),
})

/** Le prestataire intervient-il dans cette commune ? */
export function covers(p: Pick<Provider, 'wilaya' | 'wholeWilaya' | 'communes' | 'baseCommune'>, communeId: string) {
  const c = communeOf(communeId)
  const wilaya = c ? String(c.wilaya) : communeId.slice(0, 2).replace(/^0/, '')
  if (String(p.wilaya) !== wilaya) return false
  return Boolean(p.wholeWilaya) || p.baseCommune === communeId || (p.communes ?? []).includes(communeId)
}

export async function searchProviders(q: { category?: string; activity?: string; wilaya?: string; commune?: string; gender?: string; language?: string; text?: string }): Promise<ProviderCard[]> {
  const p = await getPayload()
  const and: Where[] = [{ status: { equals: 'published' } }]
  if (q.category) and.push({ categories: { in: [q.category] } })
  if (q.activity) and.push({ activities: { in: [q.activity] } })
  const wilaya = q.commune ? String(communeOf(q.commune)?.wilaya ?? q.wilaya ?? '') : q.wilaya
  if (wilaya) and.push({ wilaya: { equals: wilaya } })
  if (q.gender === 'femme' || q.gender === 'homme') and.push({ gender: { equals: q.gender } })
  if (q.language) and.push({ languages: { in: [q.language] } })
  if (q.text) and.push({ or: [{ displayName: { like: q.text } }, { bio: { like: q.text } }] })
  const { docs } = await p.find({ collection: 'providers', where: { and }, depth: 1, limit: 300, overrideAccess: true })
  return docs
    .filter((d) => !q.commune || covers(d, q.commune))
    .map(toCard)
    .sort((a, b) => Number(a.demo) - Number(b.demo) || (b.rating ?? 0) * Math.log2(2 + b.reviews) - (a.rating ?? 0) * Math.log2(2 + a.reviews) || b.missionsDone - a.missionsDone)
}

export async function categoryCounts() {
  const p = await getPayload()
  const { docs } = await p.find({ collection: 'providers', where: { status: { equals: 'published' } }, depth: 0, limit: 5000, pagination: false, overrideAccess: true, select: { categories: true } })
  const counts: Record<string, number> = {}
  for (const d of docs) for (const c of (d.categories ?? []) as string[]) counts[c] = (counts[c] ?? 0) + 1
  return counts
}

export async function getProvider(slug: string): Promise<Provider | null> {
  const p = await getPayload()
  const { docs } = await p.find({ collection: 'providers', where: { and: [{ slug: { equals: slug } }, { status: { equals: 'published' } }] }, depth: 1, limit: 1, overrideAccess: true })
  return docs[0] ?? null
}

export async function providerReviews(providerId: number) {
  const p = await getPayload()
  const { docs } = await p.find({ collection: 'provider-reviews', where: { and: [{ provider: { equals: providerId } }, { status: { equals: 'published' } }] }, depth: 1, limit: 50, sort: '-createdAt', overrideAccess: true })
  return docs.map((r) => ({ id: r.id, rating: r.rating, comment: r.comment ?? null, reply: r.reply ?? null, author: r.authorName ?? 'Client DALIL', activity: r.activity ? activityLabel(r.activity) : null, date: r.createdAt, photos: (r.photos ?? []).map((m) => (typeof m === 'object' ? { thumb: photoUrl(m), full: m.url ?? null } : null)).filter((x): x is { thumb: string | null; full: string | null } => Boolean(x?.full)) }))
}

/** Missions acceptées qui occupent l’agenda du prestataire. */
async function busyOf(p: Payload, providerId: number, from: Date, to: Date, except?: number): Promise<Busy[]> {
  const { docs } = await p.find({
    collection: 'missions',
    overrideAccess: true,
    depth: 0,
    limit: 2000,
    pagination: false,
    where: { and: [{ provider: { equals: providerId } }, { status: { equals: 'accepted' } }, { start: { less_than: to.toISOString() } }, { end: { greater_than: from.toISOString() } }, ...(except ? [{ id: { not_equals: except } }] : [])] },
  })
  return docs.map((d) => ({ start: d.start, end: d.end }))
}

/** Durée (h) d’une mission pour une prestation : choisie par le client à l’heure, indicative pour un forfait. */
const durationOf = (offer: Offer, hours?: number) => (offer.pricing === 'flat' ? offer.hours : Math.max(1, Math.min(10, Math.round(Number(hours) || 2))))
const estimateOf = (offer: Offer, hours: number) => (offer.price ? (offer.pricing === 'flat' ? offer.price : offer.price * hours) : null)

/** Jours et heures de début possibles pour une prestation. */
export async function availability(provider: Provider, activity: string, hours: number | undefined, fromDate: string, days: number) {
  const offer = offersOf(provider).find((o) => o.activity === activity)
  if (!offer) return []
  const p = await getPayload()
  const from = new Date(`${fromDate}T00:00:00+01:00`)
  const busy = await busyOf(p, provider.id, from, new Date(from.getTime() + (days + 1) * 864e5))
  return openDays(provider as never, fromDate, days, durationOf(offer, hours) * 60, busy)
}

const mail = (m: Mission, pr: Provider, client: Member): MissionMail => ({
  id: m.id,
  start: m.start,
  hours: m.hours,
  activityLabel: activityLabel(m.activity),
  providerName: pr.displayName,
  clientName: shortName(client),
  communeName: m.communeName ?? communeName(m.commune),
  address: m.address,
  details: m.details,
  estimateLabel: m.estimate ? `Estimation : ${money(m.estimate)}${m.pricing === 'hour' ? ` (${money(m.unitPrice ?? 0)}/h × ${m.hours} h)` : ' (forfait)'}` : 'Prix à convenir dans la messagerie',
  payment: pr.payment,
  respondBy: m.respondBy,
})

async function ownerOf(p: Payload, pr: Provider): Promise<Member | null> {
  if (!pr.owner) return null
  if (typeof pr.owner === 'object') return pr.owner as Member
  return (await p.findByID({ collection: 'members', id: pr.owner, overrideAccess: true }).catch(() => null)) as Member | null
}

/** Demande de mission par un client (compte vérifié, consentement, zone, clientèle, agenda). */
export async function requestMission(input: { slug: string; activity: string; start: string; hours?: number; commune: string; address: string; details?: string; consent: boolean; gender?: string }): Promise<{ id: number } | ServiceError> {
  const member = await currentMember()
  if (!member) return fail('Connectez-vous pour envoyer une demande.', 401)
  if (!member._verified) return fail('Confirmez d’abord votre adresse email (lien reçu à l’inscription).', 403)
  if (!input.consent) return fail('Merci d’accepter la transmission de vos informations au prestataire.')
  const provider = await getProvider(input.slug)
  if (!provider) return fail('Prestataire introuvable.', 404)
  if (idOf(provider.owner) === member.id) return fail('Vous ne pouvez pas vous adresser une demande.')
  const offer = offersOf(provider).find((o) => o.activity === input.activity)
  if (!offer) return fail('Cette prestation n’est pas proposée par ce prestataire.')
  if (!input.commune || !covers(provider, input.commune)) return fail('Ce prestataire n’intervient pas dans cette commune.')
  const address = String(input.address ?? '').trim().slice(0, 200)
  if (address.length < 5) return fail('Indiquez l’adresse de la mission (transmise seulement si le prestataire accepte).')

  const p = await getPayload()
  // Clientèle réservée : déclaration de la personne, enregistrée sur son compte.
  let gender = member.gender ?? null
  if (!gender && (input.gender === 'femme' || input.gender === 'homme')) {
    gender = input.gender
    await p.update({ collection: 'members', id: member.id, data: { gender }, overrideAccess: true })
  }
  if (provider.clientele === 'women' && gender !== 'femme') return fail('Ce prestataire réserve ses services aux clientes.', 403)
  if (provider.clientele === 'men' && gender !== 'homme') return fail('Ce prestataire réserve ses services aux clients.', 403)

  const open = await p.count({ collection: 'missions', where: { and: [{ client: { equals: member.id } }, { status: { equals: 'requested' } }] }, overrideAccess: true })
  if (open.totalDocs >= MAX_OPEN_REQUESTS) return fail(`Vous avez déjà ${MAX_OPEN_REQUESTS} demandes en attente de réponse.`, 429)

  const hours = durationOf(offer, input.hours)
  const start = new Date(input.start)
  if (Number.isNaN(start.getTime())) return fail('Horaire invalide.')
  const end = new Date(start.getTime() + hours * 3600e3)
  const busy = await busyOf(p, provider.id, new Date(start.getTime() - 864e5), new Date(end.getTime() + 864e5))
  if (!isRequestable(provider as never, start.toISOString(), hours * 60, busy)) return fail('Cet horaire n’est plus disponible. Choisissez-en un autre.', 409)

  const respondBy = new Date(Math.min(Date.now() + RESPONSE_HOURS * 3600e3, start.getTime()))
  const doc = await p.create({
    collection: 'missions',
    overrideAccess: true,
    data: {
      provider: provider.id,
      client: member.id,
      activity: offer.activity as Mission['activity'],
      category: activityOf(offer.activity)?.category as Mission['category'],
      start: start.toISOString(),
      end: end.toISOString(),
      hours,
      pricing: offer.pricing,
      unitPrice: offer.price ?? undefined,
      estimate: estimateOf(offer, hours) ?? undefined,
      commune: input.commune,
      communeName: communeName(input.commune) ?? undefined,
      address,
      details: String(input.details ?? '').trim().slice(0, 1000) || undefined,
      status: 'requested',
      respondBy: respondBy.toISOString(),
      consentAt: new Date().toISOString(),
    },
  })
  const info = mail(doc, provider, member)
  const owner = await ownerOf(p, provider)
  if (owner) await requestToProvider(owner.email, { ...info, address: null }).catch(() => {})
  await requestSent(member.email, info).catch(() => {})
  return { id: doc.id }
}

type Role = 'client' | 'provider'
type Loaded = { mission: Mission; provider: Provider; client: Member; role: Role }

/** Charge une mission pour un participant (contrôle d’accès) et expire les demandes sans réponse. */
async function load(member: Member, id: number): Promise<Loaded | ServiceError> {
  const p = await getPayload()
  let mission = await p.findByID({ collection: 'missions', id, depth: 2, overrideAccess: true }).catch(() => null)
  if (!mission) return fail('Mission introuvable.', 404)
  const provider = mission.provider as Provider
  const client = mission.client as Member
  const role: Role | null = client?.id === member.id ? 'client' : idOf(provider?.owner) === member.id ? 'provider' : null
  if (!role) return fail('Mission introuvable.', 404)
  if (mission.status === 'requested' && Date.parse(mission.respondBy) < Date.now()) {
    mission = await p.update({ collection: 'missions', id, data: { status: 'expired' }, overrideAccess: true, depth: 2 })
    await requestDeclined(client.email, mail(mission, provider, client), true).catch(() => {})
  }
  return { mission, provider, client, role }
}

export type MissionView = {
  id: number
  role: Role
  status: string
  activity: string
  activityLabel: string
  categoryLabel: string | null
  start: string
  end: string
  hours: number
  estimate: string | null
  pricing: string
  communeName: string | null
  address: string | null
  details: string | null
  respondBy: string
  provider: { name: string; slug: string; photo: string | null; payment: string | null }
  client: { name: string }
  canAccept: boolean
  canDecline: boolean
  canCancel: boolean
  canComplete: boolean
  canReview: boolean
  review: { rating: number; comment: string | null } | null
}

async function view(l: Loaded): Promise<MissionView> {
  const { mission: m, provider: pr, client, role } = l
  const now = Date.now()
  const p = await getPayload()
  const review = m.status === 'completed' ? (await p.find({ collection: 'provider-reviews', where: { mission: { equals: m.id } }, limit: 1, depth: 0, overrideAccess: true })).docs[0] : null
  const reviewable = role === 'client' && m.status === 'completed' && !review && now - Date.parse(m.completedAt ?? m.end) < REVIEW_WINDOW_DAYS * 864e5
  return {
    id: m.id,
    role,
    status: m.status,
    activity: m.activity,
    activityLabel: activityLabel(m.activity),
    categoryLabel: m.category ? categoryLabel(m.category) : null,
    start: m.start,
    end: m.end,
    hours: m.hours,
    estimate: m.estimate ? money(m.estimate) : null,
    pricing: m.pricing,
    communeName: m.communeName ?? communeName(m.commune),
    // L’adresse exacte n’est transmise au prestataire qu’après acceptation.
    address: role === 'client' || m.status === 'accepted' || m.status === 'completed' ? m.address : null,
    details: m.details ?? null,
    respondBy: m.respondBy,
    provider: { name: pr.displayName, slug: pr.slug ?? '', photo: photoUrl(pr.photo), payment: pr.payment ?? null },
    client: { name: shortName(client) },
    canAccept: role === 'provider' && m.status === 'requested',
    canDecline: role === 'provider' && m.status === 'requested',
    canCancel: (m.status === 'requested' && role === 'client') || (m.status === 'accepted' && Date.parse(m.start) > now),
    canComplete: m.status === 'accepted' && Date.parse(m.start) <= now,
    canReview: reviewable,
    review: review ? { rating: review.rating, comment: review.comment ?? null } : null,
  }
}

export async function getMission(member: Member, id: number): Promise<MissionView | ServiceError> {
  const l = await load(member, id)
  return 'error' in l ? l : view(l)
}

/** Accepter, décliner, annuler ou marquer comme réalisée. */
export async function actOnMission(member: Member, id: number, action: string, reason?: string): Promise<MissionView | ServiceError> {
  const l = await load(member, id)
  if ('error' in l) return l
  const { mission: m, provider: pr, client, role } = l
  const v = await view(l)
  const p = await getPayload()
  const info = mail(m, pr, client)
  const note = String(reason ?? '').trim().slice(0, 200) || undefined
  const save = (data: Partial<Mission>) => p.update({ collection: 'missions', id, data, overrideAccess: true, depth: 2 })
  let updated: Mission
  if (action === 'accept' && v.canAccept) {
    const busy = await busyOf(p, pr.id, new Date(m.start), new Date(m.end), m.id)
    if (busy.length) return fail('Vous avez déjà une mission acceptée sur cet horaire.', 409)
    updated = await save({ status: 'accepted', respondedAt: new Date().toISOString() })
    await requestAccepted(client.email, info).catch(() => {})
  } else if (action === 'decline' && v.canDecline) {
    updated = await save({ status: 'declined', respondedAt: new Date().toISOString(), cancelReason: note })
    await requestDeclined(client.email, info).catch(() => {})
  } else if (action === 'cancel' && v.canCancel) {
    if (role === 'provider' && !note) return fail('Indiquez un motif d’annulation pour le client.')
    updated = await save({ status: 'cancelled', cancelledBy: role, cancelReason: note })
    const other = role === 'client' ? await ownerOf(p, pr) : client
    if (other) await missionCancelled(other.email, info, role, note).catch(() => {})
  } else if (action === 'complete' && v.canComplete) {
    updated = await complete(p, m, pr, client)
  } else return fail('Action impossible pour cette mission.', 409)
  return view({ ...l, mission: { ...updated, provider: pr, client } })
}

async function complete(p: Payload, m: Mission, pr: Provider, client: Member) {
  const updated = await p.update({ collection: 'missions', id: m.id, data: { status: 'completed', completedAt: new Date().toISOString(), reviewInviteSentAt: new Date().toISOString() }, overrideAccess: true, depth: 0 })
  await p.update({ collection: 'providers', id: pr.id, data: { missionsDone: (pr.missionsDone ?? 0) + 1 }, overrideAccess: true })
  await reviewInvite(client.email, mail(m, pr, client)).catch(() => {})
  return updated
}

/** Avant acceptation, numéros et emails sont masqués : les échanges restent dans DALIL. */
const PHONE = /(?:\+|00)?\d[\d\s.\-()]{7,}\d/g
const EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/gi
export const maskContacts = (s: string) => s.replace(EMAIL, '[coordonnées masquées]').replace(PHONE, (x) => (x.replace(/\D/g, '').length >= 8 ? '[coordonnées masquées]' : x))

export async function listMessages(member: Member, id: number) {
  const l = await load(member, id)
  if ('error' in l) return l
  const p = await getPayload()
  const { docs } = await p.find({ collection: 'mission-messages', where: { mission: { equals: id } }, sort: 'createdAt', limit: 500, depth: 0, overrideAccess: true })
  const unread = docs.filter((d) => d.from !== l.role && d.from !== 'system' && !d.readAt).map((d) => d.id)
  if (unread.length) await p.update({ collection: 'mission-messages', where: { id: { in: unread } }, data: { readAt: new Date().toISOString() }, overrideAccess: true })
  return docs.map((d) => ({ id: d.id, mine: d.from === l.role, from: d.from, body: d.body, at: d.createdAt }))
}

export async function postMessage(member: Member, id: number, text: string) {
  const l = await load(member, id)
  if ('error' in l) return l
  const { mission: m, provider: pr, client, role } = l
  if (['declined', 'expired', 'cancelled'].includes(m.status)) return fail('Cette mission est close : la messagerie est fermée.', 409)
  let body = String(text ?? '').trim().slice(0, 2000)
  if (!body) return fail('Message vide.')
  if (m.status === 'requested') body = maskContacts(body)
  const p = await getPayload()
  const recent = await p.count({ collection: 'mission-messages', where: { and: [{ mission: { equals: id } }, { from: { equals: role } }, { createdAt: { greater_than: new Date(Date.now() - 3600e3).toISOString() } }] }, overrideAccess: true })
  if (recent.totalDocs >= 40) return fail('Trop de messages en peu de temps. Réessayez plus tard.', 429)
  const doc = await p.create({ collection: 'mission-messages', data: { mission: id, from: role, body }, overrideAccess: true })
  // Notification email de l’autre partie, au plus une fois toutes les 15 minutes par mission.
  const key = role === 'client' ? 'providerNotifiedAt' : 'clientNotifiedAt'
  const last = m[key] ? Date.parse(m[key] as string) : 0
  if (Date.now() - last > 15 * 60e3) {
    const to = role === 'client' ? (await ownerOf(p, pr))?.email : client.email
    if (to) await newMessage(to, mail(m, pr, client), role === 'client' ? shortName(client) : pr.displayName).catch(() => {})
    await p.update({ collection: 'missions', id, data: { [key]: new Date().toISOString() }, overrideAccess: true })
  }
  return { id: doc.id, mine: true, from: role, body: doc.body, at: doc.createdAt }
}

export async function leaveReview(member: Member, id: number, rating: number, comment?: string, files: Buffer[] = []) {
  const l = await load(member, id)
  if ('error' in l) return l
  const v = await view(l)
  if (!v.canReview) return fail('Avis impossible : réservé au client d’une mission terminée via DALIL, une seule fois.', 403)
  const r = Math.round(Number(rating))
  if (!(r >= 1 && r <= 5)) return fail('Note de 1 à 5.')
  if (files.length > 4) return fail('4 photos maximum.')
  const cleaned = files.map(cleanImage)
  const bad = cleaned.find((c) => 'error' in c)
  if (bad && 'error' in bad) return fail(bad.error)
  const p = await getPayload()
  // Photos publiées tout de suite, contrôlées ensuite par l’équipe (décision de Rad).
  const photos: number[] = []
  for (const c of cleaned) if (!('error' in c)) photos.push((await savePublicPhoto(p, c, { alt: `Travail réalisé — ${activityLabel(l.mission.activity)}`, uploadedBy: member.id })).id)
  await p.create({
    collection: 'provider-reviews',
    overrideAccess: true,
    data: { mission: id, provider: l.provider.id, author: member.id, authorName: shortName(member), rating: r, activity: l.mission.activity, comment: maskContacts(String(comment ?? '').trim().slice(0, 1000)) || undefined, photos, status: 'published' },
  })
  return view(l)
}

const listView = async (docs: Mission[], role: Role) =>
  Promise.all(docs.map((m) => view({ mission: m, provider: m.provider as Provider, client: m.client as Member, role })))

/** Demandes et missions du client connecté. */
export async function myMissions(member: Member) {
  const p = await getPayload()
  const { docs } = await p.find({ collection: 'missions', where: { client: { equals: member.id } }, depth: 2, limit: 200, sort: '-start', overrideAccess: true })
  return listView(docs, 'client')
}

export async function myProvider(member: Member) {
  const p = await getPayload()
  const { docs } = await p.find({ collection: 'providers', where: { owner: { equals: member.id } }, depth: 1, limit: 1, overrideAccess: true })
  return docs[0] ?? null
}

/** Demandes reçues et missions du prestataire connecté. */
export async function providerMissions(member: Member) {
  const pr = await myProvider(member)
  if (!pr) return []
  const p = await getPayload()
  const { docs } = await p.find({ collection: 'missions', where: { and: [{ provider: { equals: pr.id } }, { start: { greater_than_equal: new Date(Date.now() - 30 * 864e5).toISOString() } }] }, depth: 2, limit: 500, sort: 'start', overrideAccess: true })
  const now = Date.now()
  for (const m of docs) if (m.status === 'requested' && Date.parse(m.respondBy) < now) m.status = 'expired'
  return listView(docs, 'provider')
}

/** Champs modifiables par le prestataire (publiés tout de suite, « déclaré par le prestataire »). */
const PRO_FIELDS = ['bio', 'photo', 'languages', 'clientele', 'experienceYears', 'offers', 'payment', 'wilaya', 'baseCommune', 'wholeWilaya', 'communes', 'minNoticeHours', 'horizonDays', 'cancelNoticeHours', 'weekly', 'closures', 'legalForm', 'legalNumber'] as const
/** À la création seulement (ensuite modifiables par l’équipe, après vérification de l’identité). */
const PRO_CREATE_FIELDS = ['displayName', 'gender'] as const

export async function saveMyProvider(member: Member, body: Record<string, unknown>): Promise<Provider | ServiceError> {
  if (!member._verified) return fail('Confirmez d’abord votre adresse email.', 403)
  const p = await getPayload()
  if (member.kind !== 'pro') await p.update({ collection: 'members', id: member.id, data: { kind: 'pro' }, overrideAccess: true })
  const existing = await myProvider(member)
  const data: Record<string, unknown> = {}
  for (const k of PRO_FIELDS) if (k in body) data[k] = body[k]
  if (!existing) for (const k of PRO_CREATE_FIELDS) if (k in body) data[k] = body[k]
  delete data.photo // photo : ajoutée par l’équipe lors de la vérification (pas d’envoi de fichier public par les comptes).
  if (Array.isArray(data.communes)) data.communes = (data.communes as unknown[]).map(String).slice(0, 200)
  // Changer de numéro légal impose une nouvelle vérification.
  if (existing && (('legalNumber' in data && data.legalNumber !== existing.legalNumber) || ('legalForm' in data && data.legalForm !== existing.legalForm))) data.legalVerified = false
  try {
    if (existing) return await p.update({ collection: 'providers', id: existing.id, data, overrideAccess: true })
    return await p.create({ collection: 'providers', data: { ...data, owner: member.id, status: 'pending' } as never, overrideAccess: true })
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Enregistrement impossible.')
  }
}

/** Tâche quotidienne : expiration des demandes, rappels J-1, clôture automatique 48 h après la mission, invitation à l’avis. */
export async function dailyServicesTasks() {
  const p = await getPayload()
  const now = Date.now()
  const result = { expired: 0, reminders: 0, completed: 0, documentsPurged: 0 }
  const expired = await p.find({ collection: 'missions', where: { and: [{ status: { equals: 'requested' } }, { respondBy: { less_than: new Date(now).toISOString() } }] }, depth: 2, limit: 1000, overrideAccess: true })
  for (const m of expired.docs) {
    await p.update({ collection: 'missions', id: m.id, data: { status: 'expired' }, overrideAccess: true })
    await requestDeclined((m.client as Member).email, mail(m, m.provider as Provider, m.client as Member), true).catch(() => {})
    result.expired++
  }
  const soon = await p.find({ collection: 'missions', where: { and: [{ status: { equals: 'accepted' } }, { reminderSentAt: { exists: false } }, { start: { greater_than_equal: new Date(now + 6 * 3600e3).toISOString() } }, { start: { less_than: new Date(now + 36 * 3600e3).toISOString() } }] }, depth: 2, limit: 1000, overrideAccess: true })
  for (const m of soon.docs) {
    const pr = m.provider as Provider
    const client = m.client as Member
    const info = mail(m, pr, client)
    await missionReminder(client.email, info, 'client').catch(() => {})
    const owner = await ownerOf(p, pr)
    if (owner) await missionReminder(owner.email, info, 'provider').catch(() => {})
    await p.update({ collection: 'missions', id: m.id, data: { reminderSentAt: new Date().toISOString() }, overrideAccess: true })
    result.reminders++
  }
  const purged = await p.delete({ collection: 'provider-documents', where: { expiresAt: { less_than: new Date(now).toISOString() } }, overrideAccess: true })
  result.documentsPurged = purged.docs.length
  const done = await p.find({ collection: 'missions', where: { and: [{ status: { equals: 'accepted' } }, { end: { less_than: new Date(now - AUTO_COMPLETE_HOURS * 3600e3).toISOString() } }] }, depth: 2, limit: 1000, overrideAccess: true })
  for (const m of done.docs) {
    await complete(p, m, m.provider as Provider, m.client as Member)
    result.completed++
  }
  return result
}

/** Suppression du compte : annule les missions en cours, efface demandes, messages et avis du compte, suspend sa fiche prestataire. */
export async function deleteServicesData(member: Member) {
  const p = await getPayload()
  const active = await p.find({ collection: 'missions', where: { and: [{ client: { equals: member.id } }, { status: { in: ['requested', 'accepted'] } }] }, depth: 2, limit: 500, overrideAccess: true })
  for (const m of active.docs) {
    const pr = m.provider as Provider
    const owner = await ownerOf(p, pr)
    if (owner) await missionCancelled(owner.email, mail(m, pr, member), 'client', 'Compte supprimé').catch(() => {})
  }
  const mine = await p.find({ collection: 'missions', where: { client: { equals: member.id } }, depth: 0, limit: 5000, pagination: false, overrideAccess: true })
  const ids = mine.docs.map((m) => m.id)
  if (ids.length) {
    await p.delete({ collection: 'provider-reviews', where: { mission: { in: ids } }, overrideAccess: true })
    await p.delete({ collection: 'mission-messages', where: { mission: { in: ids } }, overrideAccess: true })
    await p.delete({ collection: 'missions', where: { id: { in: ids } }, overrideAccess: true })
  }
  const pr = await myProvider(member)
  if (pr) {
    const upcoming = await p.find({ collection: 'missions', where: { and: [{ provider: { equals: pr.id } }, { status: { in: ['requested', 'accepted'] } }] }, depth: 2, limit: 500, overrideAccess: true })
    for (const m of upcoming.docs) {
      await p.update({ collection: 'missions', id: m.id, data: { status: 'cancelled', cancelledBy: 'provider', cancelReason: 'Prestataire parti de DALIL' }, overrideAccess: true })
      await missionCancelled((m.client as Member).email, mail(m, pr, m.client as Member), 'provider', 'Le prestataire a quitté DALIL').catch(() => {})
    }
    await p.delete({ collection: 'provider-documents', where: { provider: { equals: pr.id } }, overrideAccess: true })
    await p.update({ collection: 'providers', id: pr.id, data: { status: 'suspended', owner: null, photo: null }, overrideAccess: true })
  }
  await p.delete({ collection: 'media', where: { uploadedBy: { equals: member.id } }, overrideAccess: true })
}

export const todayAlgiers = () => algiersDate(new Date())

/** Photo de profil du prestataire : publiée tout de suite, contrôlée ensuite par l’équipe. */
export async function setProviderPhoto(member: Member, file: Buffer | null): Promise<{ ok: true } | ServiceError> {
  const pr = await myProvider(member)
  if (!pr) return fail('Créez d’abord votre fiche.', 404)
  if (!file) return fail('Choisissez une photo.')
  const c = cleanImage(file)
  if ('error' in c) return fail(c.error)
  const p = await getPayload()
  const previous = idOf(pr.photo)
  const media = await savePublicPhoto(p, c, { alt: `Photo de ${pr.displayName}`, uploadedBy: member.id })
  await p.update({ collection: 'providers', id: pr.id, data: { photo: media.id }, overrideAccess: true })
  if (previous) await p.delete({ collection: 'media', id: previous, overrideAccess: true }).catch(() => {})
  return { ok: true }
}

const DOC_KINDS = ['identity', 'legal', 'background'] as const
const DOC_TTL_DAYS = 30

/** Pièce justificative : stockée dans la base, visible par l’équipe seulement, remplace la précédente du même type. */
export async function uploadProviderDocument(member: Member, kind: string, file: Buffer | null): Promise<{ ok: true } | ServiceError> {
  const pr = await myProvider(member)
  if (!pr) return fail('Créez d’abord votre fiche.', 404)
  if (!(DOC_KINDS as readonly string[]).includes(kind)) return fail('Type de pièce inconnu.')
  if (!file) return fail('Choisissez un fichier.')
  const c = cleanDocument(file)
  if ('error' in c) return fail(c.error)
  const p = await getPayload()
  await p.delete({ collection: 'provider-documents', where: { and: [{ provider: { equals: pr.id } }, { kind: { equals: kind } }] }, overrideAccess: true })
  try {
    await p.create({
      collection: 'provider-documents',
      overrideAccess: true,
      data: { provider: pr.id, kind: kind as (typeof DOC_KINDS)[number], filename: `${kind}.${c.ext}`, mimetype: c.mimetype, size: c.data.length, data: c.data.toString('base64'), expiresAt: new Date(Date.now() + DOC_TTL_DAYS * 864e5).toISOString() },
    })
  } catch {
    return fail('Enregistrement impossible. Réessayez.', 500)
  }
  return { ok: true }
}

/** Pièces reçues et en attente de vérification (sans leur contenu). */
export async function providerDocuments(providerId: number) {
  const p = await getPayload()
  const { docs } = await p.find({ collection: 'provider-documents', where: { provider: { equals: providerId } }, depth: 0, limit: 10, overrideAccess: true, select: { kind: true, createdAt: true } })
  return docs.map((d) => ({ kind: d.kind, at: d.createdAt }))
}

/** Export des données du compte (RGPD / loi 18-07) : demandes, messages, avis, fiche prestataire, pièces et photos envoyées. */
export async function exportServicesData(member: Member) {
  const p = await getPayload()
  const missions = await p.find({ collection: 'missions', where: { client: { equals: member.id } }, depth: 1, limit: 1000, sort: '-start', overrideAccess: true })
  const ids = missions.docs.map((m) => m.id)
  const messages = ids.length ? (await p.find({ collection: 'mission-messages', where: { and: [{ mission: { in: ids } }, { from: { equals: 'client' } }] }, depth: 0, limit: 5000, overrideAccess: true })).docs : []
  const reviews = await p.find({ collection: 'provider-reviews', where: { author: { equals: member.id } }, depth: 1, limit: 1000, overrideAccess: true })
  const media = await p.find({ collection: 'media', where: { uploadedBy: { equals: member.id } }, depth: 0, limit: 1000, overrideAccess: true })
  const pr = await myProvider(member)
  const fiche = pr ? (({ internalNote: _n, verifiedBy: _v, ...rest }) => rest)(pr as unknown as Record<string, unknown>) : null
  return {
    demandesDeService: missions.docs.map((m) => ({ id: m.id, prestataire: (m.provider as Provider)?.displayName, activite: activityLabel(m.activity), debut: m.start, heures: m.hours, commune: m.communeName, adresse: m.address, besoin: m.details ?? null, estimation: m.estimate ?? null, statut: m.status, consentementLe: m.consentAt, creeLe: m.createdAt })),
    messagesEnvoyes: messages.map((x) => ({ demande: typeof x.mission === 'object' ? x.mission.id : x.mission, texte: x.body, envoyeLe: x.createdAt })),
    avisPublies: reviews.docs.map((r) => ({ prestataire: (r.provider as Provider)?.displayName, note: r.rating, commentaire: r.comment ?? null, publieLe: r.createdAt, statut: r.status })),
    photosEnvoyees: media.docs.map((m) => ({ fichier: m.url, description: m.alt, envoyeeLe: m.createdAt })),
    fichePrestataire: fiche,
    piecesJustificatives: pr ? (await providerDocuments(pr.id)).map((d) => ({ type: d.kind, envoyeeLe: d.at, note: 'Contenu non exporté : consulté par l’équipe puis supprimé.' })) : [],
  }
}
