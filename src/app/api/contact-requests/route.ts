import { clean, fail, json } from '@/platform/http'
import { readSession, saveSession } from '@/modules/membres'
import { record } from '@/modules/messages'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const message = clean(body?.message, 5000)
  if (message.length < 10) return fail('Expliquez votre besoin en quelques mots.')
  const professionalSlug = clean(body?.professionalSlug, 200)
  const s = await readSession()
  if (!s) return fail('Créez votre profil pour envoyer une demande.', 401)
  await record('contact', `Contact : ${professionalSlug || 'professionnel'}`, { professionalSlug, message }, undefined, s.sid)
  s.state.contacts.unshift({ professionalSlug, message, createdAt: new Date().toISOString() })
  await saveSession(s.id, { state: s.state })
  return json({ ok: true })
}
