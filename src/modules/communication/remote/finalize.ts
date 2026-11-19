import { createHmac, timingSafeEqual } from 'crypto'
import { SITE } from '@/platform/mail'
import { signingSecret } from '@/platform/telegram/callback'
import { normalizePhone } from './validate'

/**
 * Lien « Finaliser ma fiche » envoyé par le bot après une inscription (page /finaliser, lot L1).
 * Jeton = base64url(JSON { c: collection, i: id, p: empreinte du téléphone, e: expiration (s) }) + « . » + HMAC-SHA256 (base64url),
 * secret REMOTE_SIGNING_SECRET (repli PAYLOAD_SECRET hors production, comme les boutons). Validité 7 jours.
 * Le téléphone n’apparaît jamais en clair : seule son empreinte HMAC (`finalizePhoneHash`) est dans le jeton.
 */
export const FINALIZE_TTL = 7 * 24 * 3600
type Draft = { collection: 'places'; id: number; phone?: string }
export type FinalizeToken = { collection: 'places'; id: number; phoneHash: string | null; expiresAt: number }

const mac = (key: string, body: string) => createHmac('sha256', key).update(body).digest('base64url')

/** Empreinte d’un numéro (normalisé E.164) ; null si le numéro est invalide ou le secret absent. */
export function finalizePhoneHash(phone: string): string | null {
  const key = signingSecret()
  const e164 = normalizePhone(phone)
  return key && e164 ? mac(key, `tel:${e164}`).slice(0, 22) : null
}

/** Jeton signé seul ; null sans secret. */
export function finalizeToken(draft: Draft, now = Math.floor(Date.now() / 1000)): string | null {
  const key = signingSecret()
  if (!key || draft.collection !== 'places' || !Number.isInteger(draft.id) || draft.id < 1) return null
  const body = Buffer.from(JSON.stringify({ c: draft.collection, i: draft.id, p: draft.phone ? finalizePhoneHash(draft.phone) : null, e: now + FINALIZE_TTL })).toString('base64url')
  return `${body}.${mac(key, body)}`
}

/**
 * URL signée https://www.mydalil.com/finaliser?jeton=… (7 jours). `lang` : préfixe /en ou /ar.
 * Sans secret de signature : l’adresse de la page sans jeton (la page explique de contacter l’équipe).
 */
export function finalizeLink(draft: Draft, lang: 'fr' | 'en' | 'ar' = 'fr'): string {
  const base = `${SITE}${lang === 'fr' ? '' : `/${lang}`}/finaliser`
  const t = finalizeToken(draft)
  return t ? `${base}?jeton=${t}` : base
}

/** Vérifie signature et validité ; null si le jeton est faux, altéré ou expiré. */
export function verifyFinalizeToken(jeton: unknown, now = Math.floor(Date.now() / 1000)): FinalizeToken | null {
  const key = signingSecret()
  if (!key || typeof jeton !== 'string' || jeton.length > 600) return null
  const [body, sig, extra] = jeton.split('.')
  if (!body || !sig || extra !== undefined) return null
  const want = Buffer.from(mac(key, body))
  const got = Buffer.from(sig)
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null
  try {
    const j = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as { c?: unknown; i?: unknown; p?: unknown; e?: unknown }
    if (j.c !== 'places' || !Number.isInteger(j.i) || typeof j.e !== 'number' || j.e < now) return null
    return { collection: 'places', id: j.i as number, phoneHash: typeof j.p === 'string' ? j.p : null, expiresAt: j.e }
  } catch {
    return null
  }
}
