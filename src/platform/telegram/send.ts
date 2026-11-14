import type { Payload } from 'payload'

/**
 * Telegram (Bot API, sans dépendance). Jeton : TELEGRAM_BOT_TOKEN (Vercel).
 * Destinataires : champ « Identifiant Telegram » des comptes de l’équipe dans /admin (source unique) —
 * Saïd = rôle patron, Rad = rôle admin. Sans jeton ou sans identifiant : « non configuré », jamais d’erreur.
 */
export type TelegramPerson = 'said' | 'rad'
export type SendResult = 'envoyé' | 'non configuré' | 'échec'

export const botToken = () => process.env.TELEGRAM_BOT_TOKEN?.trim() || null

export async function telegramApi<T = unknown>(method: string, body: Record<string, unknown>): Promise<{ ok: true; result: T } | { ok: false; error: string }> {
  const token = botToken()
  if (!token) return { ok: false, error: 'non configuré' }
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000) })
    const j = (await r.json().catch(() => ({}))) as { ok?: boolean; result?: T; description?: string }
    return j.ok ? { ok: true, result: j.result as T } : { ok: false, error: j.description || `HTTP ${r.status}` }
  } catch (e) {
    return { ok: false, error: (e as Error).name }
  }
}

/** Identifiants Telegram d’une personne de l’équipe (comptes /admin). */
export async function chatIdsOf(payload: Payload, who: TelegramPerson): Promise<string[]> {
  const role = who === 'said' ? 'patron' : 'admin'
  const r = await payload.find({ collection: 'users', where: { and: [{ role: { equals: role } }, { telegramId: { exists: true } }] }, limit: 5, depth: 0, overrideAccess: true, select: { telegramId: true } as never })
  return r.docs.map((d) => String((d as { telegramId?: string }).telegramId ?? '')).filter(Boolean)
}

export async function sendText(chatId: string, text: string): Promise<SendResult> {
  if (!botToken()) return 'non configuré'
  const r = await telegramApi('sendMessage', { chat_id: chatId, text: text.slice(0, 4000), disable_web_page_preview: true })
  return r.ok ? 'envoyé' : 'échec'
}

export async function sendTelegram(who: TelegramPerson, text: string, payload: Payload): Promise<SendResult> {
  if (!botToken()) return 'non configuré'
  const ids = await chatIdsOf(payload, who).catch(() => [])
  if (!ids.length) return 'non configuré'
  const results = await Promise.all(ids.map((id) => sendText(id, text)))
  return results.every((x) => x === 'envoyé') ? 'envoyé' : 'échec'
}
