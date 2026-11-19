import 'server-only'

/**
 * Transcription d’un vocal, fournisseur configurable par `TRANSCRIBE_PROVIDER` :
 * - `openai` (défaut) : gpt-4o-mini-transcribe, clé OPENAI_API_KEY ;
 * - `groq` : whisper-large-v3-turbo, clé GROQ_API_KEY.
 * Null si la clé manque ou si l’appel échoue : l’appelant répond « vocal non disponible ».
 */
type Provider = { url: string; model: string; key: string | undefined }

export function transcribeProvider(env: Record<string, string | undefined> = process.env): Provider {
  if (env.TRANSCRIBE_PROVIDER?.trim().toLowerCase() === 'groq')
    return { url: 'https://api.groq.com/openai/v1/audio/transcriptions', model: 'whisper-large-v3-turbo', key: env.GROQ_API_KEY?.trim() || undefined }
  return { url: 'https://api.openai.com/v1/audio/transcriptions', model: 'gpt-4o-mini-transcribe', key: env.OPENAI_API_KEY?.trim() || undefined }
}

export const transcriptionConfigured = () => Boolean(transcribeProvider().key)

export async function transcribe(bytes: Uint8Array, mime: string): Promise<string | null> {
  const { url, model, key } = transcribeProvider()
  if (!key || !bytes.length || bytes.length > 25 * 1024 * 1024) return null
  const ext = mime.includes('ogg') ? 'ogg' : mime.includes('mpeg') || mime.includes('mp3') ? 'mp3' : mime.includes('mp4') || mime.includes('m4a') ? 'm4a' : mime.includes('wav') ? 'wav' : mime.includes('webm') ? 'webm' : 'ogg'
  const form = new FormData()
  form.append('model', model)
  form.append('file', new Blob([bytes as BlobPart], { type: mime || 'audio/ogg' }), `vocal.${ext}`)
  try {
    const r = await fetch(url, { method: 'POST', headers: { authorization: `Bearer ${key}` }, body: form, signal: AbortSignal.timeout(30_000) })
    if (!r.ok) return null
    const j = (await r.json()) as { text?: string }
    return j.text?.trim() || null
  } catch {
    return null
  }
}
