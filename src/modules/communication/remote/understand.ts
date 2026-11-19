import 'server-only'
import type { ActionDef } from '@/platform/actions/types'
import { AI_MODEL, MONTHLY_BUDGET_MICROS, callClaude, monthSpentMicros } from '@/platform/ai'
import { PRICE_MICROS, aiConfigured } from '@/platform/ai/claude'
import { payload } from '@/platform/http'
import { parseAiChoice } from './parse'

const SYSTEM = [
  'Tu es la télécommande de DALIL, le guide de confiance de l’Algérie. Un membre de l’équipe t’écrit.',
  'Choisis UNE seule action dans la liste fournie et remplis son entrée selon son schéma JSON.',
  'N’invente aucune donnée : n’utilise que ce qui est écrit dans le message. Un champ inconnu reste absent.',
  'Réponds uniquement par un objet JSON, sans texte autour :',
  '{"action": "<nom exact>", "input": { … }} ou, si aucune action ne convient ou s’il manque une information indispensable,',
  '{"action": null, "reply": "<question courte en français>"}.',
].join('\n')

/**
 * Langage naturel → une action et ses arguments (Claude Haiku). Null si l’IA est indisponible, hors budget ou sa
 * réponse invalide : l’appelant se limite alors aux commandes explicites. Chaque appel est compté dans ai-usage
 * (usage « channel »).
 */
export async function understand(text: string, actions: ActionDef[]): Promise<{ action: string; input: Record<string, unknown> } | { action: null; reply: string } | null> {
  if (!aiConfigured() || !actions.length) return null
  try {
    if ((await monthSpentMicros()) >= MONTHLY_BUDGET_MICROS) return null
  } catch {
    return null
  }
  const list = actions.map((a) => ({ name: a.name, description: `${a.title} — ${a.description}`.slice(0, 300), lecture: a.readOnly, input: a.input }))
  const r = await callClaude(SYSTEM, `Actions disponibles :\n${JSON.stringify(list).slice(0, 24_000)}\n\nMessage :\n${text.slice(0, 2000)}`, 500)
  if (!r) return null
  try {
    const p = await payload()
    const costMicros = Math.ceil(r.inputTokens * PRICE_MICROS.input + r.outputTokens * PRICE_MICROS.output)
    // Usage « channel » : ajouté à ai-usage par le lot C1 (cast tant que payload-types ne le connaît pas).
    await p.create({ collection: 'ai-usage', overrideAccess: true, data: { feature: 'channel', inputTokens: r.inputTokens, outputTokens: r.outputTokens, costMicros, model: AI_MODEL } as never })
  } catch {
    // Le compteur ne doit pas bloquer la réponse.
  }
  return parseAiChoice(r.text, actions.map((a) => a.name))
}
