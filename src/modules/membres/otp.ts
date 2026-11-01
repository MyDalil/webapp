import 'server-only'
import { randomBytes } from 'crypto'
import { generatePayloadCookie } from 'payload/shared'
import { clean, isEmail, payload } from '@/platform/http'
import { esc, layout, send } from '@/platform/mail'
import { hit } from '@/platform/security/rateLimit'
import { challengeEmail, checkChallenge, checkTicket, makeChallenge, makeTicket, newCode } from './otpCore'

/**
 * Connexion et inscription par code reçu par email (sans mot de passe à retenir).
 * 1. `sendCode` : email → code à 6 chiffres envoyé, défi signé rendu au navigateur.
 * 2. `verifyCode` : bon code → compte existant connecté, sinon ticket d’inscription.
 * 3. `completeSignup` : ticket + prénom, nom, téléphone, conditions → compte créé et connecté.
 */

const secret = () => process.env.PAYLOAD_SECRET ?? ''
type Result = { status: number; body: Record<string, unknown>; cookie?: string }
const err = (error: string, status = 400): Result => ({ status, body: { error } })

/** Connexion d’un compte dont l’email vient d’être prouvé : mot de passe aléatoire renouvelé, puis connexion Payload standard. */
async function signIn(id: number | string, email: string): Promise<string> {
  const p = await payload()
  const password = randomBytes(24).toString('base64url')
  await p.update({ collection: 'members', id, data: { password, _verified: true, loginAttempts: 0, lockUntil: null } as never, overrideAccess: true, context: { spaceOnly: true } })
  const r = await p.login({ collection: 'members', data: { email, password } })
  return generatePayloadCookie({ collectionAuthConfig: p.collections.members.config.auth, cookiePrefix: p.config.cookiePrefix, token: r.token ?? '' })
}

export async function sendCode(rawEmail: unknown): Promise<Result> {
  const email = clean(rawEmail, 200).toLowerCase()
  if (!isEmail(email)) return err('Adresse email invalide.')
  // 5 codes par heure et par email, 20 par adresse IP (contrôle IP dans la route).
  const wait = await hit('otp-send', email, 5, 3600)
  if (wait) return err(`Trop de codes demandés. Réessayez dans ${Math.ceil(wait / 60)} minutes.`, 429)
  const code = newCode()
  const challenge = makeChallenge(secret(), email, code)
  const p = await payload()
  const known = (await p.count({ collection: 'members', where: { email: { equals: email } }, overrideAccess: true })).totalDocs > 0
  await send(
    email,
    `${code} — votre code DALIL`,
    layout(
      known ? 'Votre code de connexion.' : 'Bienvenue sur DALIL.',
      `<p>Saisissez ce code pour ${known ? 'vous connecter' : 'créer votre compte'} :</p><p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:18px 0">${esc(code)}</p><p>Le code est valable 10 minutes. Si vous n’êtes pas à l’origine de cette demande, ignorez cet email.</p>`,
    ),
  )
  return { status: 200, body: { challenge, known } }
}

export async function verifyCode(challenge: unknown, rawCode: unknown): Promise<Result> {
  const code = clean(rawCode, 12).replace(/\D/g, '')
  // Essais limités par email avant toute vérification : 6 par période de 10 minutes.
  const who = challengeEmail(String(challenge ?? ''))
  if (who && (await hit('otp-try', who, 6, 600))) return err('Trop d’essais. Demandez un nouveau code.', 429)
  const r = checkChallenge(secret(), String(challenge ?? ''), code)
  if (!r.ok) {
    if (r.reason === 'expired') return err('Code expiré. Demandez un nouveau code.', 410)
    return err('Code incorrect.', 400)
  }
  // Un défi ne sert qu’une fois.
  if (await hit('otp-used', r.nonce, 1, 900)) return err('Code déjà utilisé. Demandez un nouveau code.', 410)
  const p = await payload()
  const found = await p.find({ collection: 'members', where: { email: { equals: r.email } }, limit: 1, depth: 0, overrideAccess: true })
  const m = found.docs[0] as { id: number; kind?: string } | undefined
  if (!m) return { status: 200, body: { status: 'new', ticket: makeTicket(secret(), r.email) } }
  const cookie = await signIn(m.id, r.email)
  return { status: 200, body: { status: 'in', kind: m.kind ?? 'particulier' }, cookie }
}

export async function completeSignup(b: Record<string, unknown>): Promise<Result> {
  const email = checkTicket(secret(), String(b.ticket ?? ''))
  if (!email) return err('Session expirée. Recommencez avec votre email.', 410)
  const firstName = clean(b.firstName, 80)
  const lastName = clean(b.lastName, 80)
  const phone = clean(b.phone, 30)
  if (!firstName || !lastName) return err('Prénom et nom sont obligatoires.')
  if (!/^[+\d][\d\s().-]{6,}$/.test(phone)) return err('Numéro de téléphone invalide.')
  if (b.terms !== true) return err('Merci d’accepter les conditions d’utilisation et la politique de confidentialité.')
  const p = await payload()
  const exists = await p.find({ collection: 'members', where: { email: { equals: email } }, limit: 1, depth: 0, overrideAccess: true })
  const kind = b.kind === 'pro' ? 'pro' : 'particulier'
  const doc =
    (exists.docs[0] as { id: number } | undefined) ??
    (await p.create({
      collection: 'members',
      overrideAccess: true,
      disableVerificationEmail: true,
      data: { email, password: randomBytes(24).toString('base64url'), firstName, lastName, phone, kind, termsAcceptedAt: new Date().toISOString() } as never,
    }))
  const cookie = await signIn(doc.id, email)
  return { status: 201, body: { status: 'in', kind }, cookie }
}
