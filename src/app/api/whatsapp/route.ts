import { after } from 'next/server'
import { handleWhatsapp, verifyChallenge, verifySignature, whatsappConfigured } from '@/modules/communication'
import { json, payload } from '@/platform/http'
import { recordError } from '@/platform/monitoring/errors'
import { release } from '@/platform/security/rateLimit'
import { actionsFor, newActionId, runAction } from '@/registry'

export const maxDuration = 60

/**
 * Webhook WhatsApp Cloud API (Meta). GET : vérification (hub.verify_token = WHATSAPP_VERIFY_TOKEN).
 * POST : signature X-Hub-Signature-256 vérifiée (WHATSAPP_APP_SECRET, temps constant), réponse 200 immédiate,
 * traitement après la réponse (`after`). Désactivé (503) si une variable manque.
 */
export async function GET(req: Request) {
  if (!whatsappConfigured()) return json({ error: 'WhatsApp non configuré.' }, 503)
  const challenge = verifyChallenge(new URL(req.url).searchParams, process.env.WHATSAPP_VERIFY_TOKEN?.trim())
  return challenge ? new Response(challenge, { status: 200, headers: { 'content-type': 'text/plain' } }) : json({ error: 'Accès refusé.' }, 403)
}

export async function POST(req: Request) {
  if (!whatsappConfigured()) return json({ error: 'WhatsApp non configuré.' }, 503)
  const raw = new Uint8Array(await req.arrayBuffer())
  if (!verifySignature(raw, req.headers.get('x-hub-signature-256'), process.env.WHATSAPP_APP_SECRET?.trim())) return json({ error: 'Signature invalide.' }, 401)
  let body: unknown = null
  try {
    body = JSON.parse(new TextDecoder().decode(raw))
  } catch {
    return json({ ok: true })
  }
  after(async () => {
    try {
      await handleWhatsapp(await payload(), body, { runAction, actionsFor, newActionId })
    } catch (e) {
      // L’expéditeur a reçu « Erreur, réessayez. » (cœur de la télécommande) ; les clés d’anti-doublon de cette
      // notification sont libérées pour qu’un nouvel envoi soit traité.
      await Promise.all(messageIds(body).map((id) => release('whatsapp-message', id).catch(() => {})))
      await recordError(e, { route: '/api/whatsapp', routeType: 'whatsapp' }).catch(() => {})
    }
  })
  // Toujours 200 vite : sinon Meta renvoie la notification.
  return json({ ok: true })
}

/** Identifiants des messages d’une notification Meta (entry[].changes[].value.messages[].id). */
function messageIds(body: unknown): string[] {
  const ids: string[] = []
  for (const e of (body as { entry?: { changes?: { value?: { messages?: { id?: unknown }[] } }[] }[] } | null)?.entry ?? [])
    for (const c of e.changes ?? []) for (const m of c.value?.messages ?? []) if (typeof m.id === 'string') ids.push(m.id)
  return ids
}
