import { createHash } from 'crypto'
import { countEvent, isBot, memoryLimiter, parseBeacon } from '@/platform/metrics'

/**
 * Beacon de mesure des fiches : `{ c, i, k }` → +1 sur le compteur du jour. Réponse 204 dans tous les cas
 * (rien à apprendre pour un robot). Robots ignorés, limite de débit en mémoire par adresse IP (empreinte non stockée),
 * aucune écriture en base hors du compteur agrégé.
 */
const limited = memoryLimiter(60, 60_000)
const empty = () => new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } })

export async function POST(req: Request) {
  if (isBot(req.headers.get('user-agent'))) return empty()
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'inconnu'
  if (limited(createHash('sha256').update(ip).digest('hex').slice(0, 24))) return empty()
  const text = await req.text().catch(() => '')
  if (!text || text.length > 300) return empty()
  let body: unknown = null
  try {
    body = JSON.parse(text)
  } catch {
    return empty()
  }
  const ev = parseBeacon(body)
  if (ev) await countEvent(ev.target, ev.kind)
  return empty()
}
