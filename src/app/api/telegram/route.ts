import { handleUpdate } from '@/modules/communication'
import { json, payload } from '@/platform/http'
import { recordError } from '@/platform/monitoring/errors'
import { hit } from '@/platform/security/rateLimit'

export const maxDuration = 60

/**
 * Webhook du bot Telegram. Telegram signe chaque appel avec l’en-tête `X-Telegram-Bot-Api-Secret-Token`
 * (valeur TELEGRAM_WEBHOOK_SECRET, donnée à setWebhook). Sans secret configuré : refus. Seuls les comptes
 * de l’équipe (Identifiant Telegram) sont servis ; les autres messages sont ignorés.
 */
export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!secret) return json({ error: 'Webhook désactivé : TELEGRAM_WEBHOOK_SECRET absent.' }, 503)
  if (req.headers.get('x-telegram-bot-api-secret-token') !== secret) return json({ error: 'Accès refusé.' }, 401)
  const update = await req.json().catch(() => null)
  if (!update) return json({ ok: true })
  // Telegram renvoie un message non acquitté à temps : un même update_id n’est traité qu’une fois (48 h).
  const uid = (update as { update_id?: unknown }).update_id
  if (typeof uid === 'number' && (await hit('telegram-update', String(uid), 1, 172_800).catch(() => 1)) > 1) return json({ ok: true, doublon: true })
  try {
    await handleUpdate(await payload(), update)
  } catch (e) {
    await recordError(e, { route: '/api/telegram', routeType: 'telegram' })
  }
  // Toujours 200 : sinon Telegram renvoie le même message en boucle.
  return json({ ok: true })
}
