import 'server-only'
import type { Payload, Where } from 'payload'
import type { Classified, Media, Member } from '@/payload-types'
import { currentMember } from '@/modules/membres'
import { record } from '@/modules/messages'
import { payload as getPayload } from '@/platform/http'
import { SITE, TEAM, esc, layout, send } from '@/platform/mail'
import { WILAYAS } from '@/platform/referentiel/catalog'
import { commune as communeOf, communeName } from '@/platform/referentiel/communes'
import { cleanImage } from '@/platform/storage/images'
import { savePublicPhoto } from '@/platform/storage/upload'
import { classifiedExpired, classifiedExpiring, classifiedMessage, classifiedSubmitted, type ClassifiedMail } from './emails'
import { RULES, canRenew, categoryLabel, expiryFrom, facts, maskContacts, priceLabel, statusLabel, subLabel } from './referentiel'
import { refreshPages } from './refresh'
import { parseClassified } from './validate'

export { currentMember }
export type ClassifiedError = { error: string; status: number }
const fail = (error: string, status = 400): ClassifiedError => ({ error, status })

const DAY = 86400e3
const idOf = (v: unknown) => (v && typeof v === 'object' ? (v as { id: number }).id : (v as number))
const photoUrl = (m: number | Media | null | undefined, size: 'thumb' | 'cover' = 'thumb') => (m && typeof m === 'object' ? (m.sizes?.[size]?.url ?? m.url ?? null) : null)
const shortName = (m: Pick<Member, 'firstName' | 'lastName'>) => `${m.firstName} ${(m.lastName ?? '').charAt(0).toUpperCase()}.`.trim()
const wilayaName = (code: string) => WILAYAS.find((w) => String(w.code) === code)?.name ?? code
const mailOf = (c: Classified): ClassifiedMail => ({ title: c.title, slug: c.slug ?? String(c.id), category: c.category, reason: c.rejectionReason ?? '', expiresAt: c.expiresAt ?? undefined })
const live = (): Where => ({ and: [{ status: { equals: 'published' } }, { or: [{ expiresAt: { exists: false } }, { expiresAt: { greater_than: new Date().toISOString() } }] }] })

export type ClassifiedCard = {
  id: number
  slug: string
  href: string
  title: string
  category: string
  categoryLabel: string
  sub: string
  subLabel: string
  price: string
  place: string
  photo: string | null
  photos: number
  publishedAt: string | null
  authorKind: string
}

export const toCard = (c: Classified): ClassifiedCard => {
  const [cat, sub] = String(c.subcategory).split(':')
  return {
    id: c.id,
    slug: c.slug ?? String(c.id),
    href: `/annonces/${c.category}/${c.slug ?? c.id}`,
    title: c.title,
    category: c.category,
    categoryLabel: categoryLabel(c.category),
    sub,
    subLabel: subLabel(cat, sub),
    price: priceLabel(c),
    place: [communeName(c.commune), wilayaName(c.wilaya)].filter(Boolean).join(', '),
    photo: photoUrl((c.photos ?? [])[0] as Media | number | undefined),
    photos: (c.photos ?? []).length,
    publishedAt: c.publishedAt ?? null,
    authorKind: c.authorKind ?? 'particulier',
  }
}

export type SearchQuery = { categorie?: string; type?: string; wilaya?: string; q?: string; min?: string; max?: string; transaction?: string; tri?: string }

/** Annonces publiées et non expirées, filtrées. 60 résultats au plus, les plus récentes d’abord. */
export async function searchClassifieds(q: SearchQuery, limit = 60): Promise<ClassifiedCard[]> {
  const p = await getPayload()
  const and: Where[] = [live()]
  if (q.categorie) and.push({ category: { equals: q.categorie } })
  if (q.categorie && q.type) and.push({ subcategory: { equals: `${q.categorie}:${q.type}` } })
  if (q.wilaya) and.push({ wilaya: { equals: q.wilaya } })
  if (q.transaction) and.push({ deal: { equals: q.transaction } })
  const min = Number(q.min)
  const max = Number(q.max)
  if (q.min && Number.isFinite(min)) and.push({ price: { greater_than_equal: min } })
  if (q.max && Number.isFinite(max)) and.push({ price: { less_than_equal: max } })
  const text = q.q?.trim().slice(0, 80)
  if (text) and.push({ or: [{ title: { like: text } }, { description: { like: text } }, { brand: { like: text } }, { sector: { like: text } }] })
  const sort = q.tri === 'prix' ? 'price' : q.tri === 'prix-desc' ? '-price' : '-publishedAt'
  const { docs } = await p.find({ collection: 'classifieds', where: { and }, sort, limit, depth: 1, overrideAccess: true })
  return docs.map(toCard)
}

/** Nombre d’annonces en ligne par catégorie (accueil, rubrique). */
export async function classifiedCounts() {
  const p = await getPayload()
  const { docs } = await p.find({ collection: 'classifieds', where: live(), depth: 0, limit: 10000, pagination: false, overrideAccess: true, select: { category: true } })
  const counts: Record<string, number> = {}
  for (const d of docs) counts[d.category] = (counts[d.category] ?? 0) + 1
  return { total: docs.length, byCategory: counts }
}

export type ClassifiedView = ClassifiedCard & {
  description: string
  facts: [string, string][]
  gallery: { thumb: string; cover: string; alt: string }[]
  author: { name: string; kind: string; since: string }
  status: string
  statusLabel: string
  expiresAt: string | null
  /** Le visiteur connecté est l’auteur. */
  mine: boolean
}

/** Page d’une annonce : publiée pour tous ; l’auteur voit aussi la sienne en attente ou refusée. */
export async function getClassified(slug: string): Promise<ClassifiedView | null> {
  const p = await getPayload()
  const { docs } = await p.find({ collection: 'classifieds', where: { slug: { equals: slug } }, depth: 1, limit: 1, overrideAccess: true })
  const c = docs[0]
  if (!c) return null
  const me = await currentMember()
  const mine = !!me && idOf(c.author) === me.id
  const online = c.status === 'published' && (!c.expiresAt || Date.parse(c.expiresAt) > Date.now())
  if (!online && !mine) return null
  const author = typeof c.author === 'object' ? c.author : null
  return {
    ...toCard(c),
    description: c.description,
    facts: facts(c),
    gallery: (c.photos ?? []).filter((m): m is Media => typeof m === 'object').map((m) => ({ thumb: photoUrl(m) ?? '', cover: photoUrl(m, 'cover') ?? '', alt: m.alt ?? c.title })),
    author: { name: c.authorName ?? (author ? shortName(author) : 'Membre DALIL'), kind: c.authorKind ?? 'particulier', since: author?.createdAt ?? c.createdAt },
    status: c.status,
    statusLabel: statusLabel(c.status),
    expiresAt: c.expiresAt ?? null,
    mine,
  }
}

async function activeCount(p: Payload, member: Member) {
  const r = await p.count({ collection: 'classifieds', where: { and: [{ author: { equals: member.id } }, { status: { in: ['pending', 'published'] } }] }, overrideAccess: true })
  return r.totalDocs
}

async function savePhotos(p: Payload, member: Member, files: Buffer[], title: string) {
  const cleaned = files.map(cleanImage)
  const bad = cleaned.find((c) => 'error' in c)
  if (bad && 'error' in bad) return fail(bad.error)
  const ids: number[] = []
  for (const f of cleaned) if (!('error' in f)) ids.push((await savePublicPhoto(p, f, { alt: title, uploadedBy: member.id })).id)
  return ids
}

const communeOk = (id: string, wilaya: string) => communeOf(id)?.wilaya === Number(wilaya)

/** Dépôt : compte confirmé, limite d’annonces en cours, photos contrôlées. L’annonce attend le contrôle de l’équipe. */
export async function createClassified(member: Member, raw: Record<string, unknown>, files: Buffer[]) {
  if (!member._verified) return fail('Confirmez d’abord votre adresse email (lien reçu à l’inscription).', 403)
  const input = parseClassified(raw, communeOk)
  if ('error' in input) return fail(input.error)
  if (files.length > RULES.maxPhotos) return fail(`${RULES.maxPhotos} photos maximum.`)
  const p = await getPayload()
  const kind = member.kind === 'pro' ? 'pro' : 'particulier'
  if ((await activeCount(p, member)) >= RULES.maxActive[kind]) return fail(`Vous avez déjà ${RULES.maxActive[kind]} annonces en cours. Retirez-en une avant d’en déposer une autre.`, 409)
  const photos = await savePhotos(p, member, files, input.title)
  if ('error' in photos) return photos
  const doc = await p.create({
    collection: 'classifieds',
    data: { ...input, photos, author: member.id, authorName: shortName(member), authorKind: kind, status: 'pending' } as never,
    overrideAccess: true,
  })
  await classifiedSubmitted(member.email, mailOf(doc)).catch(() => {})
  await send(TEAM, `Annonce à contrôler — ${doc.title}`, layout('Nouvelle annonce à contrôler.', `<p><b>${esc(doc.title)}</b><br>${esc(categoryLabel(doc.category))} · ${esc(wilayaName(doc.wilaya))}</p>`, { label: 'Contrôler', href: `${SITE}/admin/collections/classifieds/${doc.id}` })).catch(() => {})
  return { id: doc.id, slug: doc.slug }
}

async function own(member: Member, id: number) {
  const p = await getPayload()
  const c = await p.findByID({ collection: 'classifieds', id, depth: 0, overrideAccess: true }).catch(() => null)
  if (!c || idOf(c.author) !== member.id) return fail('Annonce introuvable.', 404)
  return { p, c }
}

/** Modification par l’auteur : l’annonce repasse au contrôle avant d’être de nouveau visible. */
export async function updateClassified(member: Member, id: number, raw: Record<string, unknown>, files: Buffer[], keep: number[]) {
  const o = await own(member, id)
  if ('error' in o) return o
  const { p, c } = o
  if (c.status === 'closed') return fail('Annonce retirée : déposez-en une nouvelle.', 409)
  const input = parseClassified(raw, communeOk)
  if ('error' in input) return fail(input.error)
  const kept = ((c.photos ?? []) as number[]).map(idOf).filter((x) => keep.includes(x))
  if (kept.length + files.length > RULES.maxPhotos) return fail(`${RULES.maxPhotos} photos maximum.`)
  const added = await savePhotos(p, member, files, input.title)
  if ('error' in added) return added
  const doc = await p.update({ collection: 'classifieds', id, data: { ...input, photos: [...kept, ...added], status: 'pending', rejectionReason: null } as never, overrideAccess: true })
  refreshPages(doc.category, doc.slug)
  return { id: doc.id, slug: doc.slug }
}

/** Renouveler (dernière semaine ou après expiration), retirer (vendue, pourvue) ou supprimer. */
export async function classifiedAction(member: Member, id: number, action: string) {
  const o = await own(member, id)
  if ('error' in o) return o
  const { p, c } = o
  if (action === 'renew') {
    if (!canRenew(c.status, c.expiresAt)) return fail('Renouvellement possible dans les 7 derniers jours ou après expiration.', 409)
    const from = c.status === 'published' && c.expiresAt ? new Date(c.expiresAt) : new Date()
    await p.update({ collection: 'classifieds', id, data: { status: 'published', expiresAt: expiryFrom(from).toISOString(), expiryWarnedAt: null }, overrideAccess: true })
  } else if (action === 'close') {
    await p.update({ collection: 'classifieds', id, data: { status: 'closed' }, overrideAccess: true })
  } else if (action === 'delete') {
    await p.delete({ collection: 'classified-messages', where: { classified: { equals: id } }, overrideAccess: true })
    await p.delete({ collection: 'classifieds', id, overrideAccess: true })
    refreshPages(c.category, c.slug)
    return { ok: true as const }
  } else return fail('Action inconnue.')
  refreshPages(c.category, c.slug)
  return { ok: true as const }
}

export type MyClassified = ClassifiedCard & { status: string; statusLabel: string; expiresAt: string | null; rejectionReason: string | null; canRenew: boolean; conversations: number; unread: number }

/** Espace membre : ses annonces, ses conversations (comme annonceur et comme personne intéressée). */
export async function myClassifieds(member: Member) {
  const p = await getPayload()
  const { docs } = await p.find({ collection: 'classifieds', where: { author: { equals: member.id } }, sort: '-createdAt', depth: 1, limit: 200, overrideAccess: true })
  const ids = docs.map((d) => d.id)
  const msgs = ids.length ? (await p.find({ collection: 'classified-messages', where: { classified: { in: ids } }, depth: 0, limit: 5000, pagination: false, overrideAccess: true, select: { classified: true, buyer: true, from: true, readAt: true } })).docs : []
  const mine: MyClassified[] = docs.map((d) => {
    const m = msgs.filter((x) => idOf(x.classified) === d.id)
    return {
      ...toCard(d),
      status: d.status,
      statusLabel: statusLabel(d.status),
      expiresAt: d.expiresAt ?? null,
      rejectionReason: d.status === 'rejected' ? (d.rejectionReason ?? null) : null,
      canRenew: canRenew(d.status, d.expiresAt),
      conversations: new Set(m.map((x) => idOf(x.buyer))).size,
      unread: m.filter((x) => x.from === 'buyer' && !x.readAt).length,
    }
  })
  return { mine, conversations: await myConversations(p, member) }
}

export type Conversation = { classified: { id: number; title: string; href: string; photo: string | null }; buyerId: number; role: 'buyer' | 'seller'; other: string; last: string; at: string; unread: number }

async function myConversations(p: Payload, member: Member): Promise<Conversation[]> {
  const { docs } = await p.find({
    collection: 'classified-messages',
    where: { or: [{ buyer: { equals: member.id } }, { 'classified.author': { equals: member.id } }] },
    sort: '-createdAt',
    depth: 2,
    limit: 1000,
    overrideAccess: true,
  })
  const seen = new Map<string, Conversation>()
  for (const d of docs) {
    const c = d.classified as Classified
    if (!c || typeof c !== 'object') continue
    const buyer = d.buyer as Member
    const buyerId = idOf(buyer)
    const role = buyerId === member.id ? 'buyer' : 'seller'
    const key = `${c.id}:${buyerId}`
    const conv = seen.get(key) ?? {
      classified: { id: c.id, title: c.title, href: `/annonces/${c.category}/${c.slug}`, photo: null },
      buyerId,
      role,
      other: role === 'buyer' ? (c.authorName ?? 'Annonceur') : typeof buyer === 'object' ? shortName(buyer) : 'Membre DALIL',
      last: d.body,
      at: d.createdAt,
      unread: 0,
    }
    if (!d.readAt && d.from !== role && d.from !== 'system') conv.unread++
    seen.set(key, conv)
  }
  return [...seen.values()]
}

async function thread(member: Member, id: number, buyerId?: number) {
  const p = await getPayload()
  const c = await p.findByID({ collection: 'classifieds', id, depth: 0, overrideAccess: true }).catch(() => null)
  if (!c) return fail('Annonce introuvable.', 404)
  const seller = idOf(c.author) === member.id
  if (seller && !buyerId) return fail('Choisissez la conversation.', 400)
  const buyer = seller ? buyerId! : member.id
  return { p, c, role: (seller ? 'seller' : 'buyer') as 'seller' | 'buyer', buyer }
}

export async function listMessages(member: Member, id: number, buyerId?: number) {
  const t = await thread(member, id, buyerId)
  if ('error' in t) return t
  const { p, role, buyer } = t
  const { docs } = await p.find({ collection: 'classified-messages', where: { and: [{ classified: { equals: id } }, { buyer: { equals: buyer } }] }, sort: 'createdAt', limit: 500, depth: 0, overrideAccess: true })
  const unread = docs.filter((d) => d.from !== role && d.from !== 'system' && !d.readAt).map((d) => d.id)
  if (unread.length) await p.update({ collection: 'classified-messages', where: { id: { in: unread } }, data: { readAt: new Date().toISOString() }, overrideAccess: true })
  return docs.map((d) => ({ id: d.id, mine: d.from === role, from: d.from, body: d.body, at: d.createdAt }))
}

/**
 * Message dans la conversation d’une annonce. La personne intéressée écrit seulement sur une annonce en ligne ;
 * ses numéros et emails sont masqués tant que l’annonceur n’a pas répondu.
 */
export async function postMessage(member: Member, id: number, text: string, buyerId?: number) {
  if (!member._verified) return fail('Confirmez d’abord votre adresse email (lien reçu à l’inscription).', 403)
  const t = await thread(member, id, buyerId)
  if ('error' in t) return t
  const { p, c, role, buyer } = t
  if (role === 'buyer' && (c.status !== 'published' || (c.expiresAt && Date.parse(c.expiresAt) <= Date.now()))) return fail('Cette annonce n’est plus en ligne.', 409)
  let body = String(text ?? '').trim().slice(0, 2000)
  if (!body) return fail('Message vide.')
  const where: Where = { and: [{ classified: { equals: id } }, { buyer: { equals: buyer } }] }
  if (role === 'buyer') {
    const replied = await p.count({ collection: 'classified-messages', where: { and: [...(where.and as Where[]), { from: { equals: 'seller' } }] }, overrideAccess: true })
    if (!replied.totalDocs) body = maskContacts(body)
  } else {
    const started = await p.count({ collection: 'classified-messages', where, overrideAccess: true })
    if (!started.totalDocs) return fail('La personne intéressée écrit en premier.', 409)
  }
  const recent = await p.count({ collection: 'classified-messages', where: { and: [{ buyer: { equals: buyer } }, { from: { equals: role } }, { createdAt: { greater_than: new Date(Date.now() - 3600e3).toISOString() } }] }, overrideAccess: true })
  if (recent.totalDocs >= 40) return fail('Trop de messages en peu de temps. Réessayez plus tard.', 429)
  const last = await p.find({ collection: 'classified-messages', where: { and: [...(where.and as Where[]), { from: { equals: role } }] }, sort: '-createdAt', limit: 1, depth: 0, overrideAccess: true })
  const doc = await p.create({ collection: 'classified-messages', data: { classified: id, buyer, from: role, body }, overrideAccess: true })
  // Email à l’autre partie, au plus une fois toutes les 15 minutes par conversation.
  const prev = last.docs[0]?.createdAt ? Date.parse(last.docs[0].createdAt) : 0
  if (Date.now() - prev > 15 * 60e3) {
    const otherId = role === 'buyer' ? idOf(c.author) : buyer
    const other = await p.findByID({ collection: 'members', id: otherId, depth: 0, overrideAccess: true }).catch(() => null)
    const href = role === 'buyer' ? `${SITE}/annonces/messagerie?annonce=${id}&contact=${buyer}` : `${SITE}/annonces/${c.category}/${c.slug}#contact`
    if (other?.email) await classifiedMessage(other.email, mailOf(c), shortName(member), href).catch(() => {})
  }
  return { id: doc.id, mine: true, from: role, body: doc.body, at: doc.createdAt }
}

/** Signalement : enregistré dans la boîte de réception. Trois signalements retirent l’annonce jusqu’au contrôle. */
export async function reportClassified(id: number, reason: string, email?: string) {
  const p = await getPayload()
  const c = await p.findByID({ collection: 'classifieds', id, depth: 0, overrideAccess: true }).catch(() => null)
  if (!c || c.status !== 'published') return fail('Annonce introuvable.', 404)
  const why = String(reason ?? '').trim().slice(0, 1000)
  if (why.length < 5) return fail('Expliquez le problème en quelques mots.')
  await record('report', `Annonce signalée — ${c.title}`, { annonce: c.id, titre: c.title, page: `${SITE}/annonces/${c.category}/${c.slug}`, admin: `${SITE}/admin/collections/classifieds/${c.id}`, motif: why }, email)
  const reports = (c.reports ?? 0) + 1
  await p.update({ collection: 'classifieds', id, data: { reports, ...(reports >= 3 ? { status: 'pending' } : {}) }, overrideAccess: true })
  return { ok: true as const }
}

/** Tâche quotidienne : avertir 3 jours avant l’expiration, puis expirer. */
export async function dailyClassifiedTasks() {
  const p = await getPayload()
  const now = Date.now()
  let warned = 0
  let expired = 0
  const soon = await p.find({ collection: 'classifieds', where: { and: [{ status: { equals: 'published' } }, { expiresAt: { less_than: new Date(now + RULES.warnDays * DAY).toISOString() } }] }, depth: 1, limit: 1000, pagination: false, overrideAccess: true })
  for (const c of soon.docs) {
    const author = c.author as Member
    if (c.expiresAt && Date.parse(c.expiresAt) <= now) {
      await p.update({ collection: 'classifieds', id: c.id, data: { status: 'expired' }, overrideAccess: true, context: { quiet: true } })
      if (author?.email) await classifiedExpired(author.email, mailOf(c)).catch(() => {})
      expired++
    } else if (!c.expiryWarnedAt) {
      await p.update({ collection: 'classifieds', id: c.id, data: { expiryWarnedAt: new Date().toISOString() }, overrideAccess: true })
      if (author?.email) await classifiedExpiring(author.email, mailOf(c)).catch(() => {})
      warned++
    }
  }
  if (expired) refreshPages()
  return { prevenues: warned, expirees: expired }
}

/** Suppression du compte : ses annonces et toutes les conversations qui s’y rattachent. */
export async function deleteClassifiedsData(member: Member) {
  const p = await getPayload()
  const { docs } = await p.find({ collection: 'classifieds', where: { author: { equals: member.id } }, depth: 0, limit: 1000, pagination: false, overrideAccess: true })
  const ids = docs.map((d) => d.id)
  if (ids.length) await p.delete({ collection: 'classified-messages', where: { classified: { in: ids } }, overrideAccess: true })
  await p.delete({ collection: 'classified-messages', where: { buyer: { equals: member.id } }, overrideAccess: true })
  if (ids.length) await p.delete({ collection: 'classifieds', where: { id: { in: ids } }, overrideAccess: true })
  refreshPages()
}

/** Export des données du compte : ses annonces et ses messages. */
export async function exportClassifiedsData(member: Member) {
  const p = await getPayload()
  const { docs } = await p.find({ collection: 'classifieds', where: { author: { equals: member.id } }, depth: 0, limit: 1000, pagination: false, overrideAccess: true })
  const sent = await p.find({ collection: 'classified-messages', where: { or: [{ buyer: { equals: member.id } }, { 'classified.author': { equals: member.id } }] }, depth: 0, limit: 5000, pagination: false, overrideAccess: true })
  return {
    annonces: docs.map((d) => ({ titre: d.title, categorie: categoryLabel(d.category), etat: statusLabel(d.status), description: d.description, prix: priceLabel(d), creeeLe: d.createdAt })),
    messages: sent.docs.map((m) => ({ annonce: idOf(m.classified), de: m.from, texte: m.body, le: m.createdAt })),
  }
}
