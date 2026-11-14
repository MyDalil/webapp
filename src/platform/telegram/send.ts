/**
 * Envoi d’un message Telegram privé à Saïd ou à Rad (Bot API, sans dépendance).
 * Variables Vercel : TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_SAID, TELEGRAM_CHAT_RAD.
 * Sans elles : « non configuré », jamais d’erreur pour l’action d’origine.
 */
export type TelegramPerson = 'said' | 'rad'
export type SendResult = 'envoyé' | 'non configuré' | 'échec'

export const chatIdOf = (who: TelegramPerson) => (who === 'said' ? process.env.TELEGRAM_CHAT_SAID : process.env.TELEGRAM_CHAT_RAD)?.trim() || null

export async function sendTelegram(who: TelegramPerson, text: string): Promise<SendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
  const chat = chatIdOf(who)
  if (!token || !chat) return 'non configuré'
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text: text.slice(0, 4000), disable_web_page_preview: true }),
      signal: AbortSignal.timeout(8000),
    })
    return r.ok ? 'envoyé' : 'échec'
  } catch {
    return 'échec'
  }
}
