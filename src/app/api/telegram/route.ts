import { timingSafeEqual } from 'crypto'
import { webhookSecret } from '@/platform/telegram/send'
import { handleUpdate } from '@/modules/communication'
import { json, payload } from '@/platform/http'
import { recordError } from '@/platform/monitoring/errors'
import { hit, release } from '@/platform/security/rateLimit'
import { actionsFor, newActionId, runAction } from '@/registry'

export const maxDuration = 60

const testRemote = () => process.env.DALIL_TEST_REMOTE === '1' && process.env.VERCEL_ENV !== 'production'

/**
 * Webhook du bot Telegram. Telegram signe chaque appel avec l’en-tête `X-Telegram-Bot-Api-Secret-Token`
 * (valeur TELEGRAM_WEBHOOK_SECRET, donnée à setWebhook). Sans secret configuré : refus. Seuls les comptes
 * de l’équipe (Identifiant Telegram) ont les actions d’équipe ; les autres sont des visiteurs (lecture seule, contributions).
 * Le registre des actions est injecté ici : le module communication ne l’importe jamais.
 */
export async function POST(req: Request) {
  const secret = webhookSecret()
  if (!secret) return json({ error: 'Webhook désactivé : TELEGRAM_WEBHOOK_SECRET ou REMOTE_SIGNING_SECRET absent.' }, 503)
  const got = Buffer.from(req.headers.get('x-telegram-bot-api-secret-token') ?? '')
  const want = Buffer.from(secret)
  if (got.length !== want.length || !timingSafeEqual(got, want)) return json({ error: 'Accès refusé.' }, 401)
  const update = await req.json().catch(() => null)
  if (!update) return json({ ok: true })
  // Telegram renvoie un message non acquitté à temps : un même update_id n’est traité qu’une fois (48 h).
  const uid = (update as { update_id?: unknown }).update_id
  if (typeof uid === 'number' && (await hit('telegram-update', String(uid), 1, 172_800).catch(() => 1)) > 1) return json({ ok: true, doublon: true })
  let reponse: string | null = null
  try {
    // L’expéditeur reçoit « Erreur, réessayez. » en cas de panne (cœur de la télécommande).
    reponse = await handleUpdate(await payload(), update, { runAction, actionsFor, newActionId })
  } catch (e) {
    // Échec : la clé d’anti-doublon est libérée, un nouvel envoi (ou une relance de Telegram) sera traité.
    if (typeof uid === 'number') await release('telegram-update', String(uid)).catch(() => {})
    await recordError(e, { route: '/api/telegram', routeType: 'telegram' })
  }
  // Toujours 200 : sinon Telegram renvoie le même message en boucle.
  // Tests du canal (CI) : le texte répondu est exposé, jamais en production.
  if (testRemote() && reponse != null) return json({ ok: true, reponse })
  return json({ ok: true })
}
