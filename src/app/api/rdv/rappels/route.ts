import { sendReminders } from '@/modules/sante'
import { fail, json } from '@/platform/http'

/** Tâche planifiée Vercel (vercel.json) : rappels des rendez-vous du lendemain. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const ok = secret ? req.headers.get('authorization') === `Bearer ${secret}` : (req.headers.get('user-agent') ?? '').startsWith('vercel-cron')
  if (!ok) return fail('Accès refusé.', 401)
  return json(await sendReminders())
}
