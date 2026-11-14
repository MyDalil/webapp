import { runQueue } from '@/modules/agents'
import { fail, json, payload } from '@/platform/http'

export const maxDuration = 300

/**
 * Fait avancer la file des agents. Appelé par la création d’une tâche (après la réponse), par la tâche planifiée
 * et à la main depuis le cockpit. Accès : `Authorization: Bearer <CRON_SECRET>` ou un compte de l’équipe (admin, patron).
 */
async function handle(req: Request) {
  const p = await payload()
  const secret = process.env.CRON_SECRET
  const byCron = Boolean(secret) && req.headers.get('authorization') === `Bearer ${secret}`
  if (!byCron) {
    const { user } = await p.auth({ headers: req.headers })
    const role = (user as { collection?: string; role?: string } | null)
    if (role?.collection !== 'users' || !['admin', 'patron'].includes(String(role.role))) return fail('Accès refusé.', 401)
  }
  return json(await runQueue(p, { budgetMs: 240_000 }))
}

export const GET = handle
export const POST = handle
