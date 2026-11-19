import 'server-only'
import type { Payload } from 'payload'
import { hit } from '@/platform/security/rateLimit'
import { recordError } from '@/platform/monitoring/errors'
import { handleInbound, RETRY_TEXT, type Attachment, type Button, type Inbound, type RemoteDeps } from '../remote/core'
import { toE164 } from '../remote/parse'
import { messagesOf, type WaMessage } from './signature'

export { verifySignature, verifyChallenge } from './signature'

/**
 * Adaptateur WhatsApp Cloud API (Meta) de la télécommande. Aucune logique métier : traduit un message reçu
 * pour le cœur commun et renvoie la réponse (texte, boutons « reply » : 3 au plus, liste « list » : 10 au plus).
 * Variables : WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_APP_SECRET, WHATSAPP_VERIFY_TOKEN.
 * Il manque une variable : désactivé (la route répond 503), jamais d’erreur.
 */
const GRAPH = 'https://graph.facebook.com/v21.0'
const env = () => ({ token: process.env.WHATSAPP_TOKEN?.trim(), phoneId: process.env.WHATSAPP_PHONE_NUMBER_ID?.trim(), secret: process.env.WHATSAPP_APP_SECRET?.trim(), verify: process.env.WHATSAPP_VERIFY_TOKEN?.trim() })
export const whatsappConfigured = () => Object.values(env()).every(Boolean)

async function graphSend(to: string, body: Record<string, unknown>) {
  const { token, phoneId } = env()
  if (!token || !phoneId) return
  await fetch(`${GRAPH}/${phoneId}/messages`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to, ...body }),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null)
}

/**
 * Message WhatsApp d’après la réponse du cœur commun :
 * - liens (`url`) : ajoutés au texte (WhatsApp n’a pas de bouton lien dans les messages interactifs « reply » / « list ») ;
 * - 1 à 3 boutons : « reply » (titre 20 caractères au plus, libellé court `short` si donné) ;
 * - 4 à 10 boutons : liste interactive « list » (wilayas, rubriques ; titre 24 caractères, libellé complet en description).
 */
export function whatsappBody(text: string, buttons?: Button[][]): Record<string, unknown> {
  const flat = (buttons ?? []).flat()
  const links = flat.filter((b) => b.url)
  const choices = flat.filter((b) => b.data && !b.url).slice(0, 10)
  const body = [text, ...links.map((b) => `${b.text} : ${b.url}`)].join('\n\n')
  if (!choices.length) return { type: 'text', text: { body: body.slice(0, 4096), preview_url: false } }
  if (choices.length <= 3) {
    return {
      type: 'interactive',
      interactive: { type: 'button', body: { text: body.slice(0, 1024) }, action: { buttons: choices.map((b) => ({ type: 'reply', reply: { id: b.data, title: (b.short ?? b.text).slice(0, 20) } })) } },
    }
  }
  return {
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: body.slice(0, 1024) },
      action: {
        button: 'Choisir',
        sections: [{ title: 'DALIL', rows: choices.map((b) => ({ id: b.data!.slice(0, 200), title: (b.short ?? b.text).slice(0, 24), ...((b.short ?? b.text).length > 24 ? { description: b.text.slice(0, 72) } : {}) })) }],
      },
    },
  }
}

export async function sendWhatsapp(to: string, text: string, buttons?: Button[][]) {
  return graphSend(to, whatsappBody(text, buttons))
}

/** Média reçu : URL temporaire via l’API Graph, puis téléchargement avec le jeton. */
function media(id: string | undefined, mime: string | undefined, name?: string): Attachment | undefined {
  if (!id) return undefined
  return {
    name,
    load: async () => {
      const { token } = env()
      if (!token) return null
      try {
        const meta = await fetch(`${GRAPH}/${id}`, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000) })
        if (!meta.ok) return null
        const m = (await meta.json()) as { url?: string; mime_type?: string; file_size?: number }
        if (!m.url || (m.file_size ?? 0) > 20 * 1024 * 1024) return null
        const f = await fetch(m.url, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20_000) })
        if (!f.ok) return null
        return { bytes: new Uint8Array(await f.arrayBuffer()), mime: m.mime_type || mime || 'application/octet-stream' }
      } catch {
        return null
      }
    },
  }
}

export function toInbound(m: WaMessage): Inbound {
  const phone = toE164(m.from)
  const caption = m.image?.caption ?? m.document?.caption
  return {
    channel: 'whatsapp',
    chatId: m.from,
    sender: { phone },
    text: m.text?.body ?? caption,
    voice: m.type === 'audio' ? media(m.audio?.id, m.audio?.mime_type) : undefined,
    photo: m.type === 'image' ? media(m.image?.id, m.image?.mime_type) : undefined,
    document: m.type === 'document' ? media(m.document?.id, m.document?.mime_type, m.document?.filename) : undefined,
    callback: m.interactive?.button_reply?.id ?? m.interactive?.list_reply?.id ?? m.button?.payload,
  }
}

/** Traite une notification Meta déjà authentifiée. Un même message n’est traité qu’une fois (48 h). */
export async function handleWhatsapp(payload: Payload, body: unknown, deps: RemoteDeps) {
  for (const m of messagesOf(body)) {
    // Un message en erreur est journalisé et signalé à son expéditeur ; les suivants sont traités quand même.
    let answered = false
    try {
      if ((await hit('whatsapp-message', m.id, 1, 172_800).catch(() => 1)) > 1) continue
      if (!['text', 'audio', 'image', 'document', 'interactive', 'button'].includes(m.type)) {
        await sendWhatsapp(m.from, 'Format non pris en charge. Écrivez votre message ou utilisez les boutons.')
        continue
      }
      await handleInbound(payload, toInbound(m), deps, {
        send: async (t, b) => {
          await sendWhatsapp(m.from, t, b)
          answered = t === RETRY_TEXT
        },
      })
    } catch (e) {
      await recordError(e, { route: '/api/whatsapp', routeType: 'whatsapp' })
      // Le cœur commun a peut-être déjà envoyé « Erreur, réessayez. » : pas de doublon.
      if (!answered) await sendWhatsapp(m.from, RETRY_TEXT).catch(() => {})
    }
  }
}
