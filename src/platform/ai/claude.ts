import 'server-only'

/**
 * Appel minimal à l’API d’Anthropic (sans SDK) : un message, réponse courte, délai maximal.
 * Aucune conversation n’est conservée ; le texte n’est pas utilisé pour l’entraînement (conditions de l’API).
 */
export const AI_MODEL = 'claude-haiku-5-5'
/** Tarif Haiku 5.5 (requêtes ≤ 100 000 jetons) en millionièmes de dollar par jeton : 0,10 $ / million en entrée, 0,50 $ / million en sortie. */
export const PRICE_MICROS = { input: 0.1, output: 0.5 }
/** Haiku 5.5 réfléchit avant de répondre : marge de jetons pour la réflexion, en plus de la réponse. */
const THINKING_MARGIN = 1024

export const aiConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY)

export type AiReply = { text: string; inputTokens: number; outputTokens: number }

export async function callClaude(system: string, user: string, maxTokens: number): Promise<AiReply | null> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 9000)
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      // Pas de `temperature` (refusée par Haiku 5.5) ; effort faible : tâches courtes et cadrées.
      body: JSON.stringify({ model: AI_MODEL, max_tokens: maxTokens + THINKING_MARGIN, output_config: { effort: 'low' }, system, messages: [{ role: 'user', content: user }] }),
    })
    if (!res.ok) return null
    const d = (await res.json()) as { stop_reason?: string; content?: { type: string; text?: string }[]; usage?: { input_tokens?: number; output_tokens?: number } }
    if (d.stop_reason === 'refusal') return null
    const text = (d.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('').trim()
    return { text, inputTokens: d.usage?.input_tokens ?? 0, outputTokens: d.usage?.output_tokens ?? 0 }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
