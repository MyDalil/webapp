import 'server-only'

/**
 * Cloudflare Turnstile : vérification humaine invisible (case seulement si doute).
 * Activée quand `TURNSTILE_SECRET_KEY` (Vercel) et `NEXT_PUBLIC_TURNSTILE_SITE_KEY` existent.
 * Le jeton est à usage unique et vérifié auprès de Cloudflare (hôte compris).
 */
export const TURNSTILE_HEADER = 'x-dalil-humain'

const ALLOWED_HOSTS = ['mydalil.com', 'www.mydalil.com', 'preview.mydalil.com', 'localhost']

export const turnstileEnabled = () => Boolean(process.env.TURNSTILE_SECRET_KEY)

/** `true` humain confirmé, `false` refusé, `null` Turnstile non configuré. */
export async function verifyTurnstile(req: Request): Promise<boolean | null> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return null
  const token = req.headers.get(TURNSTILE_HEADER)
  if (!token || token.length > 2048) return false
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim()
  const body = new URLSearchParams({ secret, response: token })
  if (ip) body.set('remoteip', ip)
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body, signal: AbortSignal.timeout(5000) })
    const j = (await r.json()) as { success?: boolean; hostname?: string }
    if (!j.success) return false
    const host = String(j.hostname ?? '')
    return ALLOWED_HOSTS.includes(host) || host.endsWith('.vercel.app')
  } catch {
    // Cloudflare injoignable : on refuse plutôt que d’ouvrir la porte aux robots.
    return false
  }
}
