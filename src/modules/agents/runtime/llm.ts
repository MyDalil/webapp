/**
 * Appel d’un modèle, sans SDK : Anthropic (Messages) ou OpenAI (Chat Completions).
 * Coût calculé à chaque appel. Tarif connu → exact ; tarif inconnu → estimation prudente (haute), signalée.
 * Sans clé : « non configuré », jamais de réponse inventée.
 */
export type Msg = { role: 'user' | 'assistant'; content: string }
export type LlmReply = { ok: true; text: string; inputTokens: number; outputTokens: number; costMicros: number; pricing: 'exact' | 'prudent' } | { ok: false; error: 'non configuré' | 'échec' | 'refus'; detail?: string }
export type Llm = (a: { provider: 'anthropic' | 'openai'; model: string; system: string; messages: Msg[]; maxTokens: number }) => Promise<LlmReply>

/** µ$ par jeton (entrée, sortie). Seuls les tarifs vérifiés figurent ici. */
const PRICES: Record<string, { input: number; output: number }> = {
  'claude-haiku-5-5': { input: 0.1, output: 0.5 },
}
/** Tarif prudent pour un modèle sans tarif vérifié : 15 $ / 75 $ par million (le plafond reste respecté). */
const PRUDENT = { input: 15, output: 75 }

export function costOf(model: string, inputTokens: number, outputTokens: number) {
  const p = PRICES[model]
  const r = p ?? PRUDENT
  return { costMicros: Math.ceil(inputTokens * r.input + outputTokens * r.output), pricing: (p ? 'exact' : 'prudent') as 'exact' | 'prudent' }
}

const TIMEOUT = 45_000

async function anthropic(model: string, system: string, messages: Msg[], maxTokens: number): Promise<LlmReply> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return { ok: false, error: 'non configuré', detail: 'ANTHROPIC_API_KEY absente' }
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: AbortSignal.timeout(TIMEOUT),
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: maxTokens + 1024, output_config: { effort: 'low' }, system, messages }),
    })
    if (!res.ok) return { ok: false, error: 'échec', detail: `HTTP ${res.status}` }
    const d = (await res.json()) as { stop_reason?: string; content?: { type: string; text?: string }[]; usage?: { input_tokens?: number; output_tokens?: number } }
    if (d.stop_reason === 'refusal') return { ok: false, error: 'refus' }
    const text = (d.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('').trim()
    const inputTokens = d.usage?.input_tokens ?? 0
    const outputTokens = d.usage?.output_tokens ?? 0
    return { ok: true, text, inputTokens, outputTokens, ...costOf(model, inputTokens, outputTokens) }
  } catch (e) {
    return { ok: false, error: 'échec', detail: (e as Error).name }
  }
}

async function openai(model: string, system: string, messages: Msg[], maxTokens: number): Promise<LlmReply> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return { ok: false, error: 'non configuré', detail: 'OPENAI_API_KEY absente' }
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: AbortSignal.timeout(TIMEOUT),
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, max_completion_tokens: maxTokens, messages: [{ role: 'system', content: system }, ...messages], response_format: { type: 'json_object' } }),
    })
    if (!res.ok) return { ok: false, error: 'échec', detail: `HTTP ${res.status}` }
    const d = (await res.json()) as { choices?: { message?: { content?: string; refusal?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } }
    const m = d.choices?.[0]?.message
    if (m?.refusal) return { ok: false, error: 'refus' }
    const inputTokens = d.usage?.prompt_tokens ?? 0
    const outputTokens = d.usage?.completion_tokens ?? 0
    return { ok: true, text: (m?.content ?? '').trim(), inputTokens, outputTokens, ...costOf(model, inputTokens, outputTokens) }
  } catch (e) {
    return { ok: false, error: 'échec', detail: (e as Error).name }
  }
}

/**
 * Modèle de test (CI et local seulement, `DALIL_TEST_LLM=1`, refusé en production) : réponses déterministes.
 * Si la consigne demande `read-content` et qu’aucun résultat d’outil n’est encore là, il appelle l’outil ; sinon il conclut.
 */
const testLlm: Llm = async ({ messages }) => {
  const all = messages.map((m) => m.content).join('\n')
  const wantsTool = /\[outil:read-content\]/.test(all) && !/Résultat de read-content/.test(all)
  const text = wantsTool
    ? JSON.stringify({ action: { tool: 'read-content', input: { collection: 'places', query: 'Jardin' } } })
    : JSON.stringify({ final: { status: 'review', report: 'Test : travail prêt à valider.', proposal: { type: 'note', text: 'Proposition de test.' } } })
  return { ok: true, text, inputTokens: 100, outputTokens: 20, costMicros: 20, pricing: 'exact' }
}

export const callModel: Llm = (a) => {
  if (process.env.DALIL_TEST_LLM === '1' && process.env.VERCEL_ENV !== 'production') return testLlm(a)
  return a.provider === 'openai' ? openai(a.model, a.system, a.messages, a.maxTokens) : anthropic(a.model, a.system, a.messages, a.maxTokens)
}
