import 'server-only'
import { aiConfigured, callClaude } from './claude'
import { recordAi, staffAiGate } from './budget'

const MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
/** Plafond de l’API pour une image en base64 : 5 Mo. */
const MAX_BYTES = 5 * 1024 * 1024

/**
 * CONTRAT : lit une image et répond à la consigne (texte brut). Null si l’IA est indisponible ou hors budget.
 * Claude Haiku avec l’image ; appel d’équipe (plafond mensuel global seulement), compté dans ai-usage (« alt-text »).
 */
export async function readImage(bytes: Uint8Array, mime: string, prompt: string): Promise<string | null> {
  if (!aiConfigured() || !MIMES.has(mime) || !bytes.length || bytes.length > MAX_BYTES) return null
  const gate = await staffAiGate().catch(() => ({ ok: false as const }))
  if (!gate.ok) return null
  const r = await callClaude(
    'Tu décris des photos pour un guide de l’Algérie. Tu ne décris que ce qui est visible. Tu n’inventes jamais un nom de lieu, de personne ou de marque qui ne t’est pas fourni.',
    [
      { type: 'image', source: { type: 'base64', media_type: mime, data: Buffer.from(bytes).toString('base64') } },
      { type: 'text', text: prompt },
    ],
    300,
    20000,
  )
  if (!r) return null
  await recordAi('alt-text', null, r).catch(() => {})
  return r.text.trim() || null
}
