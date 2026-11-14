/**
 * UUIDv7 (RFC 9562) : 48 bits d’horodatage en millisecondes, puis du hasard.
 * Les identifiants se trient donc par date. Utilisé pour l’identifiant unique de chaque action (`action_id`).
 */
export function uuidv7(now: number = Date.now()): string {
  const b = new Uint8Array(16)
  crypto.getRandomValues(b)
  const ts = BigInt(now)
  for (let i = 0; i < 6; i++) b[i] = Number((ts >> BigInt(8 * (5 - i))) & BigInt(0xff))
  b[6] = (b[6] & 0x0f) | 0x70 // version 7
  b[8] = (b[8] & 0x3f) | 0x80 // variante RFC 4122
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

/** Identifiant d’action affiché partout (fil d’activité, Telegram, historique) : `act_<uuidv7>`. */
export const actionId = (now?: number) => `act_${uuidv7(now)}`

export const isActionId = (s: unknown): s is string =>
  typeof s === 'string' && /^act_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(s)
