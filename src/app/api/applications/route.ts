import { clean, fail, isEmail, json } from '@/platform/http'
import { currentMember, readSession, saveSession } from '@/modules/membres'
import { record } from '@/modules/messages'
import { guard } from '@/platform/security/rateLimit'
import { isVerifiedHuman, proofError } from '@/platform/security/proof'
import { looksLikeBotName } from '@/platform/security/spam'

export async function POST(req: Request) {
  const limited = await guard('candidature', 5, 3600)
  if (limited) return limited
  const robot = await proofError(req)
  if (robot) return fail(robot, 403)
  const body = await req.json().catch(() => null)
  if (!body) return fail('Formulaire invalide.')
  // Piège invisible rempli, ou nom d’activité aléatoire : réponse normale, rien n’est enregistré ni envoyé.
  if (clean(body.website) || looksLikeBotName(clean(body.businessName, 200))) return json({ ok: true })
  delete body.website
  const businessName = clean(body.businessName, 200)
  if (!businessName) return fail('Indiquez le nom de votre activité.')
  if (!isEmail(body.email)) return fail('Indiquez un email valide pour suivre votre candidature.')
  const data = Object.fromEntries(Object.entries(body).map(([k, v]) => [k, clean(v, 5000)]))
  const s = await readSession()
  const email = isEmail(data.email) ? data.email : undefined
  const member = await currentMember()
  const ack = isVerifiedHuman(req) || (!!member?.email && member.email.toLowerCase() === email?.toLowerCase())
  await record('application', businessName, data, email, s?.sid, { ack })
  if (s) {
    s.state.applications.unshift({ ...data, status: 'received', createdAt: new Date().toISOString() })
    await saveSession(s.id, { state: s.state })
  }
  return json({ ok: true })
}
