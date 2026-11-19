import 'server-only'
import type { Member } from '@/payload-types'
import { payload as getPayload } from '@/platform/http'
import { notifyStaff } from '@/platform/telegram/notify'
import { WILAYAS } from '@/platform/referentiel/catalog'
import { SPONSOR_KINDS, SPONSOR_KIND_LABEL, SPONSOR_TARGETS, requestedPeriod, type SponsorKind, type SponsorTarget } from './sponsoringCore'

/**
 * Demande de mise en avant par un pro : seulement pour une fiche qu’il possède. Crée une sponsorisation « demande » ;
 * l’équipe l’active dans /admin après paiement hors ligne. Ne touche jamais à la vérification (règle 4).
 */
type Loose = { find: (a: Record<string, unknown>) => Promise<{ docs: Record<string, unknown>[] }>; create: (a: Record<string, unknown>) => Promise<Record<string, unknown>> }

const OWNER_FIELD: Partial<Record<SponsorTarget, string>> = { practitioners: 'owner', providers: 'owner', classifieds: 'author' }
const LABEL: Record<SponsorTarget, string> = { places: 'adresse', practitioners: 'praticien', providers: 'prestataire', classifieds: 'annonce' }

export type RequestResult = { ok: true; id: unknown } | { error: string; status: number }

export async function requestSponsorship(member: Member, body: Record<string, unknown>): Promise<RequestResult> {
  if (!(member as { _verified?: boolean })._verified) return { error: 'Confirmez d’abord votre adresse email.', status: 403 }
  const collection = String(body.collection ?? '') as SponsorTarget
  const kind = String(body.kind ?? '') as SponsorKind
  if (!SPONSOR_TARGETS.includes(collection)) return { error: 'Type de fiche inconnu.', status: 400 }
  if (!SPONSOR_KINDS.includes(kind)) return { error: 'Type de mise en avant inconnu.', status: 400 }
  const ownerField = OWNER_FIELD[collection]
  // Adresses de l’annuaire : pas encore de propriétaire (revendication à venir) — refus explicite.
  if (!ownerField) return { error: 'Revendiquez d’abord cette adresse auprès de l’équipe DALIL.', status: 403 }
  const wilaya = body.wilaya == null || body.wilaya === '' ? null : String(body.wilaya)
  if (wilaya && !WILAYAS.some((w) => String(w.code) === wilaya)) return { error: 'Wilaya inconnue.', status: 400 }
  const p = (await getPayload()) as unknown as Loose
  const by = typeof body.id === 'number' || (typeof body.id === 'string' && /^\d+$/.test(body.id)) ? { id: { equals: Number(body.id) } } : typeof body.slug === 'string' ? { slug: { equals: body.slug.slice(0, 160) } } : null
  if (!by) return { error: 'Fiche à préciser.', status: 400 }
  const { docs } = await p.find({ collection, where: { and: [by, { [ownerField]: { equals: member.id } }] }, depth: 0, limit: 1, overrideAccess: true })
  const target = docs[0]
  if (!target) return { error: 'Cette fiche n’est pas rattachée à votre compte.', status: 403 }
  const pending = await p.find({ collection: 'sponsorships', where: { and: [{ targetCollection: { equals: collection } }, { targetId: { equals: String(target.id) } }, { status: { equals: 'demande' } }] }, depth: 0, limit: 1, overrideAccess: true })
  if (pending.docs.length) return { error: 'Une demande est déjà en cours pour cette fiche.', status: 409 }
  const period = requestedPeriod({ startsAt: body.startsAt, months: body.months })
  const created = await p.create({
    collection: 'sponsorships',
    data: { targetCollection: collection, targetId: String(target.id), kind, wilaya, ...period, status: 'demande', paymentNote: '', requestedBy: member.id },
    overrideAccess: true,
  })
  const name = String(target.name ?? target.displayName ?? target.title ?? target.id)
  await notifyStaff(`Demande de mise en avant « ${SPONSOR_KIND_LABEL[kind]} » — ${LABEL[collection]} ${name}${wilaya ? ` (wilaya ${wilaya})` : ''}, du ${period.startsAt.slice(0, 10)} au ${period.endsAt.slice(0, 10)}. À activer dans /admin après paiement.`)
  return { ok: true, id: created.id }
}
