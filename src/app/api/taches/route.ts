import { sendReminders } from '@/modules/sante'
import { dailyServicesTasks } from '@/modules/services'
import { purgeContributionPhotos } from '@/modules/messages'
import { dailyClassifiedTasks } from '@/modules/annonces'
import { fail, json } from '@/platform/http'
import { purgeRateLimits } from '@/platform/security/rateLimit'

/** Tâche planifiée Vercel quotidienne (vercel.json) : rappels des rendez-vous et missions, expirations, clôtures. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const ok = secret ? req.headers.get('authorization') === `Bearer ${secret}` : (req.headers.get('user-agent') ?? '').startsWith('vercel-cron')
  if (!ok) return fail('Accès refusé.', 401)
  const result = { rendezVous: await sendReminders(), services: await dailyServicesTasks(), photosProposeesSupprimees: await purgeContributionPhotos(), annonces: await dailyClassifiedTasks() }
  await purgeRateLimits()
  return json(result)
}
