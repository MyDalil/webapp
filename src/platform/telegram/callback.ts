import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Données signées des boutons Telegram (callback_data, 64 octets maximum) et WhatsApp (id de bouton « reply »).
 * Format : `<op>.<ref>.<horodatage>.<signature>` — op = une lettre (p publier, c corriger, r rejeter, t publier sur le canal,
 * x confirmer une action d’administration), ref = identifiant d’action (UUID) ou référence courte,
 * horodatage = secondes Unix en base 36 (validité 7 jours), signature = HMAC-SHA256 tronqué (16 caractères base64url).
 * Usage unique : la signature sert de clé d’anti-rejeu (vérifiée par le cœur de la télécommande).
 * Secret : REMOTE_SIGNING_SECRET (32 caractères au moins) ; en production (VERCEL_ENV=production) il est obligatoire,
 * sans repli sur PAYLOAD_SECRET : sans lui, aucun bouton (null) et une alerte. En preview et en local, repli sur PAYLOAD_SECRET.
 */
export type CallbackOp = 'p' | 'c' | 'r' | 't' | 'x'
const OPS: readonly string[] = ['p', 'c', 'r', 't', 'x']
const REF = /^[A-Za-z0-9-]{1,40}$/
export const CALLBACK_MAX = 64
/** Validité d’un bouton : 7 jours. */
export const CALLBACK_TTL = 7 * 24 * 3600
export const MIN_SECRET = 32
export const SIGNING_OFF = 'Boutons désactivés : REMOTE_SIGNING_SECRET (32 caractères au moins) manquant. Faites-le dans /admin.'

let alerted = false
function misconfigured() {
  if (alerted) return
  alerted = true
  const msg = 'REMOTE_SIGNING_SECRET absent ou trop court (32 caractères au moins) en production : boutons Telegram et WhatsApp désactivés.'
  console.error(`[boutons] ${msg}`)
  void import('@/platform/monitoring/errors')
    .then((m) => m.recordError(new Error(msg), { route: 'remote-signing', routeType: 'config' }))
    .catch(() => {})
}

/** Secret de signature des boutons ; chaîne vide = boutons désactivés. */
export function signingSecret(env: Record<string, string | undefined> = process.env): string {
  const dedicated = env.REMOTE_SIGNING_SECRET?.trim() ?? ''
  if (env.VERCEL_ENV === 'production') {
    if (dedicated.length >= MIN_SECRET) return dedicated
    misconfigured()
    return ''
  }
  return dedicated || env.PAYLOAD_SECRET?.trim() || ''
}

const mac = (key: string, body: string) => createHmac('sha256', key).update(body).digest('base64url').slice(0, 16)
const nowSec = () => Math.floor(Date.now() / 1000)

export function signCallback(op: CallbackOp, ref: string, at = nowSec()): string | null {
  const key = signingSecret()
  if (!key || !OPS.includes(op) || !REF.test(ref)) return null
  const body = `${op}.${ref}.${at.toString(36)}`
  const data = `${body}.${mac(key, body)}`
  return Buffer.byteLength(data) <= CALLBACK_MAX ? data : null
}

export type CallbackRead =
  | { ok: true; op: CallbackOp; ref: string; /** émission, secondes Unix */ at: number; sig: string }
  | { ok: false; reason: 'invalide' | 'expire' }

/** Vérifie signature et validité (7 jours). La signature (`sig`) sert de clé d’usage unique. */
export function readCallback(data: unknown, now = nowSec()): CallbackRead {
  const key = signingSecret()
  if (!key || typeof data !== 'string' || Buffer.byteLength(data) > CALLBACK_MAX) return { ok: false, reason: 'invalide' }
  const parts = data.split('.')
  if (parts.length !== 4) return { ok: false, reason: 'invalide' }
  const [op, ref, ts, sig] = parts
  if (!OPS.includes(op) || !REF.test(ref) || !/^[0-9a-z]{1,8}$/.test(ts)) return { ok: false, reason: 'invalide' }
  const want = Buffer.from(mac(key, `${op}.${ref}.${ts}`))
  const got = Buffer.from(sig)
  if (got.length !== want.length || !timingSafeEqual(got, want)) return { ok: false, reason: 'invalide' }
  const at = parseInt(ts, 36)
  if (at > now + 300 || now - at > CALLBACK_TTL) return { ok: false, reason: 'expire' }
  return { ok: true, op: op as CallbackOp, ref, at, sig }
}

/** Raccourci : `{ op, ref }` si la donnée est signée et valide, sinon null. */
export function verifyCallback(data: unknown, now?: number): { op: CallbackOp; ref: string } | null {
  const r = readCallback(data, now)
  return r.ok ? { op: r.op, ref: r.ref } : null
}

/**
 * Confirmations signées (op `x`) : action d’administration ↔ code d’une lettre. Partagé par la télécommande (communication)
 * et les modules qui émettent des boutons (pros : abonnements, revendications, paiements), sans import entre modules.
 */
const CONFIRM: Record<string, string> = {
  publier_fiche: 'f',
  rejeter_fiche: 'j',
  envoyer_newsletter: 'n',
  publier_canal: 'k',
  restaurer: 's',
  restaurer_corbeille: 'b',
  arreter_le_site: 'h',
  relancer_le_site: 'l',
  activer_abonnement: 'a',
  refuser_abonnement: 'u',
  decider_revendication: 'd',
  valider_paiement: 'v',
}
const CONFIRM_BACK = Object.fromEntries(Object.entries(CONFIRM).map(([k, v]) => [v, k]))
/** Actions confirmées sans numéro de document (arrêt général) : la référence porte seulement le mode. */
const NO_ID: Record<string, readonly string[]> = { arreter_le_site: ['drain', 'stop'], relancer_le_site: [] }

/** Décision d’une revendication portée par la référence : « d-ok-12 » (acceptee) ou « d-no-12 » (refusee). */
const DECISION: Record<string, Record<string, string>> = { decider_revendication: { acceptee: 'ok', refusee: 'no' } }

/** Référence de confirmation : « n-12 », « s-places-12 », « d-ok-12 », « h-drain » ou « l ». Null si l’action ou l’entrée ne s’y prête pas. */
export function confirmRef(name: string, input: Record<string, unknown>): string | null {
  const code = CONFIRM[name]
  if (!code) return null
  const modes = NO_ID[name]
  if (modes) {
    if (!modes.length) return code
    const mode = typeof input.mode === 'string' ? input.mode : modes[0]
    return modes.includes(mode) ? `${code}-${mode}` : null
  }
  const id = Number(input.id)
  if (!Number.isInteger(id) || id < 1) return null
  const decisions = DECISION[name]
  if (decisions) {
    const d = decisions[String(input.decision)]
    return d ? `${code}-${d}-${id}` : null
  }
  const coll = typeof input.collection === 'string' && /^[a-z]+$/.test(input.collection) ? input.collection : null
  const ref = coll ? `${code}-${coll}-${id}` : `${code}-${id}`
  return ref.length <= 38 ? ref : null
}

export function readConfirmRef(ref: string): { name: string; input: Record<string, unknown> } | null {
  const bare = /^([a-z])(?:-([a-z]+))?$/.exec(ref)
  if (bare) {
    const name = CONFIRM_BACK[bare[1]]
    const modes = name ? NO_ID[name] : undefined
    if (!name || !modes) return null
    if (!modes.length) return bare[2] ? null : { name, input: { confirmer: true } }
    return bare[2] && modes.includes(bare[2]) ? { name, input: { mode: bare[2], confirmer: true } } : null
  }
  const m = /^([a-z])-(?:([a-z]+)-)?(\d+)$/.exec(ref)
  const name = m ? CONFIRM_BACK[m[1]] : undefined
  if (!m || !name || NO_ID[name]) return null
  const decisions = DECISION[name]
  if (decisions) {
    const decision = Object.entries(decisions).find(([, v]) => v === m[2])?.[0]
    return decision ? { name, input: { id: Number(m[3]), decision, confirmer: true } } : null
  }
  return { name, input: { id: Number(m[3]), ...(m[2] ? { collection: m[2] } : {}), confirmer: true } }
}
