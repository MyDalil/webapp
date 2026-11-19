import { fail, json, payload } from '@/platform/http'
import { SITE } from '@/platform/mail'
import { botToken, telegramApi, webhookSecret, webhookUrl } from '@/platform/telegram/send'

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
  return json({ configured: true, secret: Boolean(webhookSecret()), me, hook })
}

export async function POST(req: Request) {
  if (!(await staff(req))) return fail('Accès refusé.', 401)
  const secret = webhookSecret()
  if (!botToken() || !secret) return fail('TELEGRAM_BOT_TOKEN et REMOTE_SIGNING_SECRET (ou TELEGRAM_WEBHOOK_SECRET) sont nécessaires.', 422)
  const url = webhookUrl(new URL(req.url).origin, SITE)
  const r = await telegramApi('setWebhook', { url, secret_token: secret, allowed_updates: ['message', 'callback_query'], drop_pending_updates: true })
  // Depuis le bouton de /admin/controle (formulaire) : retour à la page avec le résultat lisible.
  if ((req.headers.get('content-type') ?? '').includes('form')) {
    const back = new URL('/admin/controle', req.url)
    back.searchParams.set('telegram', r.ok ? 'ok' : 'echec')
    return Response.redirect(back, 303)
  }
  return json(r, r.ok ? 200 : 502)
}
