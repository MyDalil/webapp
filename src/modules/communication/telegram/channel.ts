import { sql } from '@payloadcms/db-postgres'
import type { CollectionAfterChangeHook, Payload } from 'payload'
import { after } from 'next/server'
import { SITE } from '@/platform/mail'
import { botToken, telegramApi } from '@/platform/telegram/send'

/**
 * Canal Telegram de DALIL : envoi d’une publication décidée par Saïd (statut « Programmée »), retrait sur décision.
 * Le canal est réglé dans Commandes (`telegramChannelId`, patron seul) ; le bot doit en être administrateur.
 */
type Post = { id: number; status?: string; text?: string; textAr?: string | null; photo?: unknown; buttons?: Array<{ label: string; url: string }> | null; silent?: boolean | null; pin?: boolean | null; messageId?: number | null; scheduledAt?: string | null }

const worker = { telegramWorker: true }

async function channelId(payload: Payload) {
  const c = (await payload.findGlobal({ slug: 'controls', overrideAccess: true, depth: 0 })) as { telegramChannelId?: string | null; telegramEnabled?: boolean | null; killSwitch?: string }
  if (c.killSwitch === 'cut' || c.telegramEnabled === false) return { error: 'Telegram coupé (Commandes)' }
  return c.telegramChannelId ? { id: c.telegramChannelId } : { error: 'canal non réglé (Commandes)' }
}

export async function publishPost(payload: Payload, id: number) {
  const post = (await payload.findByID({ collection: 'telegram-posts', id, depth: 1, overrideAccess: true })) as unknown as Post
  if (post.status !== 'scheduled') return { ok: false, detail: `statut ${post.status}` }
  const fail = async (error: string) => { await payload.update({ collection: 'telegram-posts', id, overrideAccess: true, context: worker, data: { status: 'failed', error: error.slice(0, 250) } as never }); return { ok: false, detail: error } }
  if (!botToken()) return fail('jeton du bot non configuré (TELEGRAM_BOT_TOKEN)')
  const ch = await channelId(payload)
  if ('error' in ch) return fail(ch.error!)
  // Réservation en UNE requête : si deux envois partent en même temps (après la décision et la tâche planifiée), un seul gagne.
  const db = payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<{ rows: unknown[] }> } }
  const claimed = await db.drizzle.execute(sql`UPDATE telegram_posts SET status = 'publishing', updated_at = now() WHERE id = ${id} AND status = 'scheduled' RETURNING id`)
  if (!claimed.rows.length) return { ok: false, detail: 'déjà pris par un autre envoi' }
  const text = [post.text, post.textAr].filter(Boolean).join('\n\n').slice(0, 4096)
  const keyboard = post.buttons?.length ? { inline_keyboard: post.buttons.map((b) => [{ text: b.label, url: b.url }]) } : undefined
  const photoUrl = (post.photo as { url?: string } | null)?.url
  const r = photoUrl
    ? await telegramApi<{ message_id: number }>('sendPhoto', { chat_id: ch.id, photo: photoUrl.startsWith('http') ? photoUrl : `${SITE}${photoUrl}`, caption: text.slice(0, 1024), reply_markup: keyboard, disable_notification: !!post.silent })
    : await telegramApi<{ message_id: number }>('sendMessage', { chat_id: ch.id, text, reply_markup: keyboard, disable_notification: !!post.silent, disable_web_page_preview: false })
  if (!r.ok) return fail(r.error)
  if (post.pin) await telegramApi('pinChatMessage', { chat_id: ch.id, message_id: r.result.message_id, disable_notification: true })
  await payload.update({ collection: 'telegram-posts', id, overrideAccess: true, context: worker, data: { status: 'published', messageId: r.result.message_id, publishedAt: new Date().toISOString(), error: null } as never })
  return { ok: true, detail: `message ${r.result.message_id}` }
}

export async function removeFromChannel(payload: Payload, post: Post) {
  if (!post.messageId) return
  const ch = await channelId(payload)
  if ('error' in ch) return
  const r = await telegramApi('deleteMessage', { chat_id: ch.id, message_id: post.messageId })
  if (!r.ok) await payload.update({ collection: 'telegram-posts', id: post.id, overrideAccess: true, context: worker, data: { error: `retrait : ${r.error}`.slice(0, 250) } as never })
}

/** Publications programmées arrivées à échéance (tâche planifiée). */
export async function publishDue(payload: Payload) {
  const due = await payload.find({ collection: 'telegram-posts', where: { and: [{ status: { equals: 'scheduled' } }, { or: [{ scheduledAt: { exists: false } }, { scheduledAt: { less_than_equal: new Date().toISOString() } }] }] }, limit: 10, depth: 0, overrideAccess: true })
  const out = []
  for (const p of due.docs) out.push(await publishPost(payload, p.id as number))
  return { published: out.filter((o) => o.ok).length, failed: out.filter((o) => !o.ok).length }
}

/** Décision de Saïd : publier maintenant (date passée ou vide) ou retirer du canal. Envoi après la réponse. */
export const channelOnDecision: CollectionAfterChangeHook = async ({ doc, previousDoc, req }) => {
  if (req.context?.telegramWorker) return doc
  const now = !doc.scheduledAt || new Date(doc.scheduledAt).getTime() <= Date.now()
  let job: (() => Promise<unknown>) | null = null
  if (doc.status === 'scheduled' && previousDoc?.status !== 'scheduled' && now) job = () => publishPost(req.payload, doc.id)
  if (doc.status === 'deleted' && previousDoc?.status === 'published') job = () => removeFromChannel(req.payload, doc as Post)
  if (job) {
    const run = job
    try { after(run) } catch { void run() }
  }
  return doc
}
