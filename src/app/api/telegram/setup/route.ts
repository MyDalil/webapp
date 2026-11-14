import { fail, json, payload } from '@/platform/http'
import { SITE } from '@/platform/mail'
import { botToken, telegramApi } from '@/platform/telegram/send'

/** État du bot (GET) et branchement du webhook (POST). Administrateur ou patron. */
async function staff(req: Request) {
  const { user } = await (await payload()).auth({ headers: req.headers })
  const u = user as { collection?: string; role?: string } | null
  return u?.collection === 'users' && ['admin', 'patron'].includes(String(u.role))
}

export async function GET(req: Request) {
  if (!(await staff(req))) return fail('Accès refusé.', 401)
  if (!botToken()) return json({ configured: false, detail: 'TELEGRAM_BOT_TOKEN absent' })
  const [me, hook] = await Promise.all([telegramApi('getMe', {}), telegramApi('getWebhookInfo', {})])
  return json({ configured: true, secret: Boolean(process.env.TELEGRAM_WEBHOOK_SECRET), me, hook })
}

export async function POST(req: Request) {
  if (!(await staff(req))) return fail('Accès refusé.', 401)
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!botToken() || !secret) return fail('TELEGRAM_BOT_TOKEN et TELEGRAM_WEBHOOK_SECRET sont nécessaires.', 422)
  const r = await telegramApi('setWebhook', { url: `${SITE}/api/telegram`, secret_token: secret, allowed_updates: ['message'], drop_pending_updates: true })
  return json(r, r.ok ? 200 : 502)
}
