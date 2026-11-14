import type { Payload, PayloadRequest } from 'payload'
import { esc, layout, paragraphs, send } from '@/platform/mail'
import { appendThread, inboundToSubmission, replySubject, type ReceivedEmail } from './inbound'

/** Enregistre un email reçu comme demande « email ». Idempotent (identifiant du message). Aucune réponse automatique. */
export async function recordInboundEmail(payload: Payload, email: ReceivedEmail) {
  const r = inboundToSubmission(email)
  if ('skip' in r) return { skipped: r.skip }
  const exists = await payload.count({ collection: 'submissions', overrideAccess: true, where: { externalId: { equals: r.data.externalId as string } } })
  if (exists.totalDocs) return { skipped: 'déjà enregistré' }
  const doc = await payload.create({ collection: 'submissions', overrideAccess: true, data: r.data as never })
  return { id: doc.id }
}

const STATUSES = ['processing', 'needs_info', 'done', 'rejected'] as const
type Status = (typeof STATUSES)[number]

/**
 * Réponse de l’équipe au demandeur, depuis la boîte unique. L’email part avec « Répondre à » = l’équipe ;
 * la réponse et son état d’envoi s’ajoutent au fil de la demande. Le changement de statut éventuel
 * n’envoie pas le second email automatique (`skipNotify`) : une seule réponse par action.
 */
export async function replyToSubmission(req: PayloadRequest, id: number, text: string, status?: string) {
  const doc = (await req.payload.findByID({ collection: 'submissions', id, req, overrideAccess: false, depth: 0 })) as { subject: string; email?: string | null; thread?: unknown }
  if (!doc.email) return { ok: false as const, error: 'Cette demande n’a pas d’adresse email.' }
  const body = text.trim().slice(0, 8000)
  if (body.length < 2) return { ok: false as const, error: 'Réponse vide.' }
  const delivered = await send(doc.email, replySubject(doc.subject), layout(esc(replySubject(doc.subject)), paragraphs(body)))
  const by = String((req.user as { name?: string; email?: string } | null)?.name ?? 'Équipe DALIL')
  const data: Record<string, unknown> = { thread: appendThread(doc.thread, { at: new Date().toISOString(), by, text: body, delivered }) }
  if (status && (STATUSES as readonly string[]).includes(status)) data.status = status as Status
  await req.payload.update({ collection: 'submissions', id, req, overrideAccess: false, data: data as never, context: { skipNotify: true } })
  return { ok: true as const, delivered }
}
