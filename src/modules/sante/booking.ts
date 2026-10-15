import 'server-only'
import { headers as nextHeaders } from 'next/headers'
import type { Payload } from 'payload'
import type { Appointment, Media, Member, Practitioner } from '@/payload-types'
import { payload as getPayload } from '@/platform/http'
import { createVideoRoom, videoEnabled } from '@/platform/video'
import { algiersDate, isBookable, slotsBetween, type Mode } from './availability'
import { bookingCancelled, bookingConfirmed, bookingReminder, bookingToPractitioner } from './emails'
import { specialtyLabel } from './specialties'

export type BookingError = { error: string; status: number }
const fail = (error: string, status = 400): BookingError => ({ error, status })

/** Compte public connecté (null sinon). */
export async function currentMember(): Promise<Member | null> {
  const p = await getPayload()
  const { user } = await p.auth({ headers: await nextHeaders() })
  return user && (user as { collection?: string }).collection === 'members' ? (user as unknown as Member) : null
}

const photoUrl = (m: number | Media | null | undefined) => (m && typeof m === 'object' ? (m.sizes?.thumb?.url ?? m.url ?? null) : null)

export type PractitionerCard = {
  slug: string
  name: string
  title: string | null
  specialties: string[]
  city: string
  wilaya: string | null
  address: string | null
  modes: Mode[]
  languages: string[]
  fee: string | null
  photo: string | null
  verified: boolean
  demo: boolean
  next: string | null
}

const card = (p: Practitioner, next: string | null): PractitionerCard => ({
  slug: p.slug ?? String(p.id),
  name: p.name,
  title: p.title ?? (p.specialties?.[0] ? specialtyLabel(p.specialties[0]) : null),
  specialties: (p.specialties ?? []) as string[],
  city: p.city,
  wilaya: p.wilaya ?? null,
  address: p.address ?? null,
  modes: bookableModes(p),
  languages: (p.languages ?? []) as string[],
  fee: p.fee ?? null,
  photo: photoUrl(p.photo),
  verified: Boolean(p.identityVerified) && (p.diplomas ?? []).some((d) => d.verified),
  demo: Boolean(p.demo),
  next,
})

/** Modes réellement réservables : la visio attend le choix du fournisseur. */
export const bookableModes = (p: Pick<Practitioner, 'modes'>): Mode[] => ((p.modes ?? []) as Mode[]).filter((m) => m === 'cabinet' || videoEnabled())

async function takenStarts(p: Payload, practitionerId: number, from: Date, to: Date) {
  const { docs } = await p.find({
    collection: 'appointments',
    overrideAccess: true,
    depth: 0,
    limit: 2000,
    pagination: false,
    where: { and: [{ practitioner: { equals: practitionerId } }, { status: { equals: 'confirmed' } }, { start: { greater_than_equal: from.toISOString() } }, { start: { less_than: to.toISOString() } }] },
  })
  return docs.map((d) => new Date(d.start).toISOString())
}

/** Créneaux libres d’un praticien sur `days` jours à partir d’une date d’Alger. */
export async function freeSlots(practitioner: Practitioner, fromDate: string, days: number, mode?: Mode) {
  const p = await getPayload()
  const from = new Date(`${fromDate}T00:00:00+01:00`)
  const to = new Date(from.getTime() + (days + 1) * 864e5)
  const taken = await takenStarts(p, practitioner.id, from, to)
  const modes = bookableModes(practitioner)
  return slotsBetween(practitioner as never, fromDate, days, taken, new Date(), mode).map((d) => ({
    date: d.date,
    slots: d.slots.map((s) => ({ ...s, modes: s.modes.filter((m) => modes.includes(m)) })).filter((s) => s.modes.length),
  }))
}

/** Premier créneau libre dans les 30 prochains jours. */
async function nextFree(practitioner: Practitioner) {
  const days = await freeSlots(practitioner, algiersDate(new Date()), 30)
  return days.find((d) => d.slots.length)?.slots[0]?.start ?? null
}

export async function getPractitioner(slug: string): Promise<Practitioner | null> {
  const p = await getPayload()
  const { docs } = await p.find({ collection: 'practitioners', where: { and: [{ slug: { equals: slug } }, { status: { equals: 'published' } }] }, depth: 1, limit: 1, overrideAccess: true })
  return docs[0] ?? null
}

export async function searchPractitioners(q: { specialty?: string; wilaya?: string; mode?: string; language?: string; text?: string }): Promise<PractitionerCard[]> {
  const p = await getPayload()
  const and: Record<string, unknown>[] = [{ status: { equals: 'published' } }]
  if (q.specialty) and.push({ specialties: { in: [q.specialty] } })
  if (q.wilaya) and.push({ wilaya: { equals: q.wilaya } })
  if (q.mode) and.push({ modes: { in: [q.mode] } })
  if (q.language) and.push({ languages: { in: [q.language] } })
  if (q.text) and.push({ or: [{ name: { like: q.text } }, { city: { like: q.text } }, { cabinetName: { like: q.text } }] })
  const { docs } = await p.find({ collection: 'practitioners', where: { and } as never, depth: 1, limit: 200, overrideAccess: true, sort: 'name' })
  const cards = await Promise.all(docs.map(async (d) => card(d, await nextFree(d))))
  // Les praticiens disponibles le plus tôt d’abord, puis les autres.
  return cards.sort((a, b) => (a.next ?? '9999').localeCompare(b.next ?? '9999'))
}

export const toCard = (p: Practitioner) => card(p, null)

/** Réserver (ou déplacer, si `replaces` est fourni) un créneau. */
export async function book(input: { slug: string; start: string; mode: Mode; reason?: string; consent: boolean; replaces?: number }): Promise<{ id: number } | BookingError> {
  const member = await currentMember()
  if (!member) return fail('Connectez-vous pour réserver.', 401)
  if (!member._verified) return fail('Confirmez d’abord votre adresse email (lien reçu à l’inscription).', 403)
  if (!input.consent) return fail('Merci d’accepter la transmission de vos informations au praticien.')
  const practitioner = await getPractitioner(input.slug)
  if (!practitioner) return fail('Praticien introuvable.', 404)
  if (!bookableModes(practitioner).includes(input.mode)) return fail('Ce type de consultation n’est pas disponible.')
  const start = new Date(input.start)
  if (Number.isNaN(start.getTime())) return fail('Créneau invalide.')
  const p = await getPayload()
  const taken = await takenStarts(p, practitioner.id, new Date(start.getTime() - 864e5), new Date(start.getTime() + 864e5))
  if (!isBookable(practitioner as never, start.toISOString(), input.mode, taken)) return fail('Ce créneau vient d’être pris ou n’est plus disponible.', 409)

  let previous: Appointment | null = null
  if (input.replaces) {
    previous = await p.findByID({ collection: 'appointments', id: input.replaces, depth: 0, overrideAccess: true }).catch(() => null)
    if (!previous || Number(previous.patient) !== member.id || previous.status !== 'confirmed') return fail('Rendez-vous à déplacer introuvable.', 404)
  }
  const end = new Date(start.getTime() + (practitioner.slotMinutes ?? 30) * 60000)
  let doc: Appointment
  try {
    doc = await p.create({
      collection: 'appointments',
      overrideAccess: true,
      data: {
        practitioner: practitioner.id,
        patient: member.id,
        start: start.toISOString(),
        end: end.toISOString(),
        mode: input.mode,
        status: 'confirmed',
        reason: (input.reason ?? '').trim().slice(0, 300) || undefined,
        consentAt: new Date().toISOString(),
        slotKey: `${practitioner.id}:${start.toISOString()}`,
      },
    })
  } catch {
    return fail('Ce créneau vient d’être pris. Choisissez-en un autre.', 409)
  }
  if (input.mode === 'visio') {
    const url = await createVideoRoom({ appointmentId: doc.id, start: doc.start, end: doc.end })
    if (url) doc = await p.update({ collection: 'appointments', id: doc.id, data: { videoUrl: url }, overrideAccess: true })
  }
  if (previous) await cancel(previous.id, 'patient', 'Rendez-vous déplacé', { silent: true, ignoreNotice: true })

  const rdv = rdvInfo(practitioner, doc, member)
  await bookingConfirmed({ to: member.email, firstName: member.firstName }, rdv).catch(() => {})
  const owner = await ownerOf(practitioner)
  if (owner) await bookingToPractitioner({ to: owner.email }, rdv).catch(() => {})
  return { id: doc.id }
}

const rdvInfo = (pr: Practitioner, a: Appointment, patient?: Member | null) => ({
  start: a.start,
  mode: a.mode,
  practitionerName: pr.name,
  address: pr.address,
  city: pr.city,
  fee: pr.fee,
  payment: pr.payment,
  paymentLink: pr.paymentLink,
  videoUrl: a.videoUrl,
  reason: a.reason,
  cancelNoticeHours: pr.cancelNoticeHours,
  patientName: patient ? `${patient.firstName} ${patient.lastName}` : undefined,
})

async function ownerOf(pr: Practitioner): Promise<Member | null> {
  if (!pr.owner) return null
  if (typeof pr.owner === 'object') return pr.owner as Member
  const p = await getPayload()
  return (await p.findByID({ collection: 'members', id: pr.owner, overrideAccess: true }).catch(() => null)) as Member | null
}

/** Annulation par le patient ou le praticien (contrôle des droits et du délai). */
export async function cancel(id: number, by: 'patient' | 'practitioner', reason?: string, opts: { silent?: boolean; ignoreNotice?: boolean } = {}): Promise<{ ok: true } | BookingError> {
  const p = await getPayload()
  const member = opts.ignoreNotice ? null : await currentMember()
  const a = await p.findByID({ collection: 'appointments', id, depth: 2, overrideAccess: true }).catch(() => null)
  if (!a || a.status !== 'confirmed') return fail('Rendez-vous introuvable.', 404)
  const pr = a.practitioner as Practitioner
  const patient = a.patient as Member
  if (!opts.ignoreNotice) {
    if (!member) return fail('Connectez-vous.', 401)
    const ownerId = typeof pr.owner === 'object' ? pr.owner?.id : pr.owner
    if (by === 'patient' && patient.id !== member.id) return fail('Accès refusé.', 403)
    if (by === 'practitioner' && ownerId !== member.id) return fail('Accès refusé.', 403)
    if (by === 'patient' && Date.parse(a.start) - Date.now() < (pr.cancelNoticeHours ?? 24) * 3600e3)
      return fail(`L’annulation en ligne n’est plus possible moins de ${pr.cancelNoticeHours ?? 24} h avant. Contactez le cabinet.`)
  }
  await p.update({ collection: 'appointments', id, overrideAccess: true, data: { status: 'cancelled', cancelledBy: by, cancelReason: reason?.slice(0, 200), slotKey: null } })
  if (!opts.silent) {
    const rdv = rdvInfo(pr, a as Appointment, patient)
    if (by === 'practitioner') await bookingCancelled({ to: patient.email }, rdv, by, reason).catch(() => {})
    else {
      const owner = await ownerOf(pr)
      if (owner) await bookingCancelled({ to: owner.email }, rdv, by, reason).catch(() => {})
    }
  }
  return { ok: true }
}

export type AppointmentView = { id: number; start: string; end: string; mode: Mode; status: string; reason: string | null; practitioner: { name: string; slug: string; address: string | null; city: string; fee: string | null; payment: string | null }; patient?: { name: string; phone: string; email: string }; videoUrl: string | null; canCancel: boolean }

const view = (a: Appointment, forPractitioner = false): AppointmentView => {
  const pr = a.practitioner as Practitioner
  const pa = a.patient as Member
  return {
    id: a.id,
    start: a.start,
    end: a.end,
    mode: a.mode,
    status: a.status,
    reason: a.reason ?? null,
    practitioner: { name: pr.name, slug: pr.slug ?? '', address: pr.address ?? null, city: pr.city, fee: pr.fee ?? null, payment: pr.payment ?? null },
    patient: forPractitioner ? { name: `${pa.firstName} ${pa.lastName}`, phone: pa.phone, email: pa.email } : undefined,
    videoUrl: a.videoUrl ?? null,
    canCancel: a.status === 'confirmed' && (forPractitioner || Date.parse(a.start) - Date.now() >= (pr.cancelNoticeHours ?? 24) * 3600e3),
  }
}

/** Rendez-vous du patient connecté. */
export async function myAppointments(member: Member) {
  const p = await getPayload()
  const { docs } = await p.find({ collection: 'appointments', where: { patient: { equals: member.id } }, depth: 2, limit: 200, sort: '-start', overrideAccess: true })
  return docs.map((a) => view(a))
}

/** Fiche praticien du compte pro connecté. */
export async function myPractitioner(member: Member) {
  const p = await getPayload()
  const { docs } = await p.find({ collection: 'practitioners', where: { owner: { equals: member.id } }, depth: 1, limit: 1, overrideAccess: true })
  return docs[0] ?? null
}

export async function practitionerAgenda(member: Member) {
  const pr = await myPractitioner(member)
  if (!pr) return []
  const p = await getPayload()
  const { docs } = await p.find({ collection: 'appointments', where: { and: [{ practitioner: { equals: pr.id } }, { start: { greater_than_equal: new Date(Date.now() - 7 * 864e5).toISOString() } }] }, depth: 2, limit: 500, sort: 'start', overrideAccess: true })
  return docs.map((a) => view(a, true))
}

/** Champs qu’un praticien peut modifier lui-même (publiés tout de suite, « déclaré par le praticien »). */
const PRO_FIELDS = ['title', 'bio', 'languages', 'cabinetName', 'address', 'city', 'wilaya', 'phone', 'modes', 'fee', 'payment', 'paymentLink', 'slotMinutes', 'minNoticeHours', 'horizonDays', 'cancelNoticeHours', 'weekly', 'closures'] as const
/** À la création seulement (ensuite, modifiables par l’équipe après vérification). */
const PRO_CREATE_FIELDS = ['name', 'specialties', 'diplomas'] as const

export async function saveMyPractitioner(member: Member, body: Record<string, unknown>): Promise<Practitioner | BookingError> {
  if (!member._verified) return fail('Confirmez d’abord votre adresse email.', 403)
  const p = await getPayload()
  // Un seul compte par personne : l’espace professionnel s’active sur le compte existant.
  if (member.kind !== 'pro') await p.update({ collection: 'members', id: member.id, data: { kind: 'pro' }, overrideAccess: true })
  const existing = await myPractitioner(member)
  const data: Record<string, unknown> = {}
  for (const k of PRO_FIELDS) if (k in body) data[k] = body[k]
  if (!existing) for (const k of PRO_CREATE_FIELDS) if (k in body) data[k] = body[k]
  if (Array.isArray(data.diplomas)) data.diplomas = (data.diplomas as Record<string, unknown>[]).map((d) => ({ title: d.title, institution: d.institution, year: d.year, verified: false }))
  try {
    if (existing) return await p.update({ collection: 'practitioners', id: existing.id, data, overrideAccess: true })
    return await p.create({ collection: 'practitioners', data: { ...data, owner: member.id, status: 'pending' } as never, overrideAccess: true })
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Enregistrement impossible.')
  }
}

/** Rappels de la veille (tâche planifiée quotidienne). */
export async function sendReminders() {
  const p = await getPayload()
  const from = new Date(Date.now() + 6 * 3600e3)
  const to = new Date(Date.now() + 36 * 3600e3)
  const { docs } = await p.find({ collection: 'appointments', where: { and: [{ status: { equals: 'confirmed' } }, { reminderSentAt: { exists: false } }, { start: { greater_than_equal: from.toISOString() } }, { start: { less_than: to.toISOString() } }] }, depth: 2, limit: 1000, overrideAccess: true })
  let sent = 0
  for (const a of docs) {
    const patient = a.patient as Member
    await bookingReminder({ to: patient.email, firstName: patient.firstName }, rdvInfo(a.practitioner as Practitioner, a as Appointment, patient)).catch(() => {})
    await p.update({ collection: 'appointments', id: a.id, data: { reminderSentAt: new Date().toISOString() }, overrideAccess: true })
    sent++
  }
  return { sent }
}

/** Suppression du compte (RGPD / loi 18-07) : annule les rendez-vous à venir puis efface le compte. */
export async function deleteMyAccount(member: Member) {
  const p = await getPayload()
  const { docs } = await p.find({ collection: 'appointments', where: { and: [{ patient: { equals: member.id } }, { status: { equals: 'confirmed' } }, { start: { greater_than: new Date().toISOString() } }] }, depth: 0, limit: 500, overrideAccess: true })
  for (const a of docs) await cancel(a.id, 'patient', 'Compte supprimé', { ignoreNotice: true })
  await p.delete({ collection: 'appointments', where: { patient: { equals: member.id } }, overrideAccess: true })
  const pr = await myPractitioner(member)
  if (pr) await p.update({ collection: 'practitioners', id: pr.id, data: { status: 'suspended', owner: null }, overrideAccess: true })
  await p.delete({ collection: 'members', id: member.id, overrideAccess: true })
}
