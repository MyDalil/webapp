import { clean, isEmail, json, payload } from '@/platform/http'
import { guard } from '@/platform/security/rateLimit'

/**
 * Mot de passe oublié (remplace la route Payload du même chemin) : 5 demandes par heure et par adresse IP,
 * 3 par heure et par email, pour qu’on ne puisse pas inonder la boîte de quelqu’un. Réponse identique que le
 * compte existe ou non.
 */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}))
  const email = clean(b.email, 200).toLowerCase()
  const limited = (await guard('forgot', 5, 3600)) ?? (isEmail(email) ? await guard('forgot-email', 3, 3600, email) : null)
  if (limited) return limited
  if (isEmail(email)) {
    const p = await payload()
    await p.forgotPassword({ collection: 'members', data: { email } }).catch(() => {})
  }
  return json({ message: 'Si un compte existe avec cet email, un lien vient d’être envoyé.' })
}
