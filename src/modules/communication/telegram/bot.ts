import type { Payload } from 'payload'
import { botToken, telegramApi } from '@/platform/telegram/send'
import { handleInbound, type Attachment, type Button, type Inbound, type RemoteDeps } from '../remote/core'
import { addressedToBot } from '../remote/parse'

/**
 * Adaptateur Telegram de la télécommande : traduit un « update » en message entrant pour le cœur commun
 * (`remote/core.ts`) et renvoie la réponse. Aucune logique métier ici.
 * - Conversation privée : compte équipe (Identifiant Telegram) ou visiteur public (lecture seule).
 * - Groupe de discussion lié au canal (TELEGRAM_GROUP_ID) : le bot répond seulement si on le mentionne ou avec /chercher,
 *   par un bouton qui ouvre la conversation privée (t.me/<bot>?start=chercher).
 * - Autres groupes, canaux : ignorés.
 */
type TgFile = { file_id: string; mime_type?: string; file_name?: string; file_size?: number }
type TgMessage = {
  message_id?: number
  chat?: { id?: number | string; type?: string }
  from?: { id?: number; is_bot?: boolean; language_code?: string }
  text?: string
  caption?: string
  voice?: TgFile
  audio?: TgFile
  photo?: TgFile[]
  document?: TgFile
}
export type TelegramUpdate = { update_id?: number; message?: TgMessage; callback_query?: { id: string; from?: { id?: number; language_code?: string }; data?: string; message?: TgMessage } }

const MAX_FILE = 20 * 1024 * 1024
let botNameCache: string | null | undefined

async function botName(): Promise<string | undefined> {
  if (process.env.TELEGRAM_BOT_USERNAME) return process.env.TELEGRAM_BOT_USERNAME.replace(/^@/, '')
  if (botNameCache === undefined) {
    const r = await telegramApi<{ username?: string }>('getMe', {})
    botNameCache = r.ok ? (r.result.username ?? null) : null
  }
  return botNameCache ?? undefined
}

function attachment(f: TgFile | undefined, fallbackMime: string): Attachment | undefined {
  if (!f) return undefined
  return {
    name: f.file_name,
    load: async () => {
      if (f.file_size && f.file_size > MAX_FILE) return null
      const r = await telegramApi<{ file_path?: string }>('getFile', { file_id: f.file_id })
      if (!r.ok || !r.result.file_path) return null
      try {
        const res = await fetch(`https://api.telegram.org/file/bot${botToken()}/${r.result.file_path}`, { signal: AbortSignal.timeout(20_000) })
        if (!res.ok) return null
        return { bytes: new Uint8Array(await res.arrayBuffer()), mime: f.mime_type || res.headers.get('content-type') || fallbackMime }
      } catch {
        return null
      }
    },
  }
}

/** Clavier en ligne : bouton de rappel (`data`) ou lien (`url`). En groupe : liens seulement (lecture seule). */
export function keyboard(buttons?: Button[][], linksOnly = false) {
  const rows = (buttons ?? [])
    .map((row) => row.flatMap((b): { text: string; url?: string; callback_data?: string }[] => (b.url ? [{ text: b.text, url: b.url }] : b.data && !linksOnly ? [{ text: b.text, callback_data: b.data }] : [])))
    .filter((row) => row.length)
  return rows.length ? { reply_markup: { inline_keyboard: rows } } : {}
}

export async function handleUpdate(payload: Payload, update: TelegramUpdate, deps: RemoteDeps): Promise<string | null> {
  const cq = update.callback_query
  const msg = cq?.message ?? update.message
  const chatId = msg?.chat?.id != null ? String(msg.chat.id) : null
  if (!chatId || !msg) return null
  if (cq) await telegramApi('answerCallbackQuery', { callback_query_id: cq.id })

  const type = msg.chat?.type
  const groupId = process.env.TELEGRAM_GROUP_ID?.trim()
  const inGroup = type === 'group' || type === 'supergroup'
  if (inGroup && (!groupId || chatId !== groupId)) return null
  if (!inGroup && type !== 'private') return null
  if (msg.from?.is_bot && !cq) return null

  const name = await botName()
  const text = msg.text ?? msg.caption ?? ''
  // Groupe : seulement si l’on s’adresse au bot ; seul bouton possible : le lien vers la conversation privée.
  if (inGroup && (cq || !addressedToBot(text, name))) return null

  const senderId = cq?.from?.id ?? msg.from?.id
  const inbound: Inbound = {
    channel: 'telegram',
    chatId,
    sender: { telegramId: senderId != null ? String(senderId) : undefined },
    text: cq ? undefined : text,
    voice: cq ? undefined : attachment(msg.voice ?? msg.audio, 'audio/ogg'),
    photo: cq ? undefined : attachment(msg.photo?.length ? msg.photo[msg.photo.length - 1] : undefined, 'image/jpeg'),
    document: cq ? undefined : attachment(msg.document, 'text/csv'),
    callback: cq?.data,
    inGroup,
    botName: name,
    lang: cq?.from?.language_code ?? msg.from?.language_code,
  }
  // Dernier texte envoyé : renvoyé à la route (mode test du canal, jamais en production).
  const sent: string[] = []
  const send = async (t: string, buttons?: Button[][]) => {
    sent.push(t)
    await telegramApi('sendMessage', { chat_id: chatId, text: t.slice(0, 4000), disable_web_page_preview: true, ...(inGroup && msg.message_id ? { reply_parameters: { message_id: msg.message_id } } : {}), ...keyboard(buttons, inGroup) })
  }
  const result = await handleInbound(payload, inbound, deps, { send })
  return sent.at(-1) ?? result
}
