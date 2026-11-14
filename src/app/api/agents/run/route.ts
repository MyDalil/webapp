import { runQueue } from '@/modules/agents'
import { publishDue } from '@/modules/communication'
import { fail, json, payload } from '@/platform/http'

export const maxDuration = 300

/**
 * Fait avancer la file des agents et publie les messages du canal arrivés à échéance. Appelé par la création d’une tâche (après la réponse), par la tâche planifiée
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
  const canal = await publishDue(p).catch((e: Error) => ({ error: e.message }))
  return json({ ...(await runQueue(p, { budgetMs: 240_000 })), canal })
}

/** GET : tâche planifiée seulement (Vercel envoie le secret). Depuis un navigateur, un lien ne doit jamais lancer les agents. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return fail('Accès refusé : GET réservé à la tâche planifiée.', 401)
  return handle(req)
}
export const POST = handle
