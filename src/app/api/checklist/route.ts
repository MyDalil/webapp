import { clean, fail, json } from '@/platform/http'
import { readSession, saveSession } from '@/modules/membres'

const tasks = (c: Record<string, boolean>) => Object.entries(c).map(([taskKey, completed]) => ({ taskKey, completed }))

export async function GET() {
  const s = await readSession()
  if (!s) return fail('Connectez-vous pour suivre votre préparation.', 401)
  return json({ tasks: tasks(s.state.checklist) })
}

export async function POST(req: Request) {
  const s = await readSession()
  if (!s) return fail('Connectez-vous pour suivre votre préparation.', 401)
  const body = await req.json().catch(() => ({}))
  const taskKey = clean(body.taskKey, 80)
  if (!taskKey) return fail('Étape invalide.')
  s.state.checklist[taskKey] = !!body.completed
  await saveSession(s.id, { state: s.state })
  return json({ ok: true, tasks: tasks(s.state.checklist) })
}
