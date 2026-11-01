import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto'

/**
 * Code de connexion par email (OTP), sans table : le serveur renvoie un « défi » signé (email, échéance, aléa)
 * et ne garde pas le code. Le code n’est vérifiable qu’avec le secret serveur ; les essais sont limités
 * (route) et chaque défi n’est utilisable qu’une fois (compteur de débit sur l’aléa).
 */

export const OTP_TTL_SEC = 10 * 60
export const TICKET_TTL_SEC = 20 * 60

const b64 = (s: string) => Buffer.from(s).toString('base64url')
const unb64 = (s: string) => Buffer.from(s, 'base64url').toString()
const mac = (secret: string, scope: string, payload: string) => createHmac('sha256', `otp:${scope}:${secret}`).update(payload).digest('base64url')
const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))

/** Code à 6 chiffres (zéros en tête permis). */
export const newCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0')

/** Défi lié à l’email et au code : `email|échéance|aléa` en clair + signature qui inclut le code. */
export function makeChallenge(secret: string, email: string, code: string, now = Date.now()) {
  const nonce = randomBytes(12).toString('base64url')
  const body = `${email}|${Math.floor(now / 1000) + OTP_TTL_SEC}|${nonce}`
  return `${b64(body)}.${mac(secret, 'code', `${body}|${code}`)}`
}

export type ChallengeCheck = { ok: true; email: string; nonce: string } | { ok: false; reason: 'format' | 'expired' | 'code' }

export function checkChallenge(secret: string, challenge: string, code: string, now = Date.now()): ChallengeCheck {
  const [raw, sig] = String(challenge).split('.')
  if (!raw || !sig || !/^\d{6}$/.test(code)) return { ok: false, reason: 'format' }
  const body = unb64(raw)
  const [email, exp, nonce] = body.split('|')
  if (!email || !exp || !nonce) return { ok: false, reason: 'format' }
  if (Number(exp) * 1000 < now) return { ok: false, reason: 'expired' }
  if (!same(sig, mac(secret, 'code', `${body}|${code}`))) return { ok: false, reason: 'code' }
  return { ok: true, email, nonce }
}

/** Ticket « email prouvé » pour finir l’inscription (prénom, nom, téléphone) sans redemander de code. */
export function makeTicket(secret: string, email: string, now = Date.now()) {
  const body = `${email}|${Math.floor(now / 1000) + TICKET_TTL_SEC}`
  return `${b64(body)}.${mac(secret, 'ticket', body)}`
}

export function checkTicket(secret: string, ticket: string, now = Date.now()): string | null {
  const [raw, sig] = String(ticket).split('.')
  if (!raw || !sig) return null
  const body = unb64(raw)
  const [email, exp] = body.split('|')
  if (!email || !exp || Number(exp) * 1000 < now) return null
  return same(sig, mac(secret, 'ticket', body)) ? email : null
}

/** Email porté par un défi (non vérifié) : sert seulement à compter les essais avant la vérification. */
export function challengeEmail(challenge: string): string {
  try {
    return unb64(String(challenge).split('.')[0] ?? '').split('|')[0] ?? ''
  } catch {
    return ''
  }
}
