import { fail, json } from '@/platform/http'
import { readSession, saveSession } from '@/modules/membres'
import { record } from '@/modules/messages'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body.answers !== 'object') return fail('Réponses manquantes.')
  const s = await readSession()
  await record('diagnostic', 'Parcours personnalisé', body.answers, undefined, s?.sid)
  if (!s) return fail('Créez votre profil pour enregistrer votre parcours.', 401)
  s.state.diagnostics.unshift({ answers: body.answers, createdAt: new Date().toISOString() })
  await saveSession(s.id, { state: s.state })
  return json({ ok: true })
}
