import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Signature des appels Meta (WhatsApp Cloud API) : en-tête `X-Hub-Signature-256: sha256=<hex>`,
 * HMAC-SHA256 du corps brut avec le secret de l’application (WHATSAPP_APP_SECRET). Comparaison en temps constant.
 */
export function verifySignature(rawBody: string | Uint8Array, header: string | null, appSecret: string | undefined): boolean {
  if (!appSecret || !header?.startsWith('sha256=')) return false
  const got = Buffer.from(header.slice(7), 'hex')
  const want = createHmac('sha256', appSecret).update(typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf8') : Buffer.from(rawBody)).digest()
  return got.length === want.length && timingSafeEqual(got, want)
}

/** Vérification du webhook (GET) : renvoie le défi si le jeton correspond, sinon null. */
export function verifyChallenge(params: URLSearchParams, verifyToken: string | undefined): string | null {
  if (!verifyToken) return null
  if (params.get('hub.mode') !== 'subscribe') return null
  const token = params.get('hub.verify_token') ?? ''
  const a = Buffer.from(token)
  const b = Buffer.from(verifyToken)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  return params.get('hub.challenge')
}

export type WaMessage = {
  from: string
  id: string
  type: string
  text?: { body?: string }
  audio?: { id: string; mime_type?: string }
  image?: { id: string; mime_type?: string; caption?: string }
  document?: { id: string; mime_type?: string; filename?: string; caption?: string }
  interactive?: { type?: string; button_reply?: { id?: string; title?: string }; list_reply?: { id?: string; title?: string } }
  button?: { payload?: string; text?: string }
}

/** Messages reçus dans une notification Meta (les statuts de livraison sont ignorés). */
export function messagesOf(body: unknown): WaMessage[] {
  const entries = (body as { object?: string; entry?: { changes?: { field?: string; value?: { messages?: WaMessage[] } }[] }[] } | null)
  if (entries?.object !== 'whatsapp_business_account') return []
  return (entries.entry ?? []).flatMap((e) => (e.changes ?? []).filter((c) => c.field === 'messages').flatMap((c) => c.value?.messages ?? [])).filter((m) => typeof m?.from === 'string' && typeof m?.id === 'string')
}
