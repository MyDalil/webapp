import { clean, fail, isEmail, json, readSession, record, saveSession } from '@/lib/site'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return fail('Formulaire invalide.')
  const businessName = clean(body.businessName, 200)
  if (!businessName) return fail('Indiquez le nom de votre activité.')
  const data = Object.fromEntries(Object.entries(body).map(([k, v]) => [k, clean(v, 5000)]))
  const s = await readSession()
  const email = isEmail(data.email) ? data.email : undefined
  await record('application', businessName, data, email, s?.sid)
  if (s) {
    s.state.applications.unshift({ ...data, status: 'received', createdAt: new Date().toISOString() })
    await saveSession(s.id, { state: s.state })
  }
  return json({ ok: true })
}
