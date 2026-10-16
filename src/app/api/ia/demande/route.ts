import { currentMember } from '@/modules/membres'
import { INTENT_SYSTEM, intentFrom, localIntent, parseJson } from '@/modules/recherche'
import { MAX_INPUT_CHARS, aiGate, callClaude, recordAi, simpleClean } from '@/platform/ai'
import { clean, json } from '@/platform/http'
import { guard } from '@/platform/security/rateLimit'

/**
 * Barre « Demandez à DALIL » : brouillon nettoyé + page à ouvrir, pré-remplie. Aucune action n’est faite à la place
 * de la personne. IA pour les comptes vérifiés (quota et plafond partagés avec la reformulation), repérage simple sinon.
 */
export async function POST(req: Request) {
  const limited = await guard('ia-demande', 60, 3600)
  if (limited) return limited
  const b = await req.json().catch(() => ({}))
  const text = clean(b.text, MAX_INPUT_CHARS)
  const simple = simpleClean(text)
  if (!simple) return json({ intent: null })
  const member = await currentMember()
  const gate = await aiGate(member)
  if (gate.ok) {
    const reply = await callClaude(INTENT_SYSTEM, `<demande>${text.replace(/<\/?demande>/g, '')}</demande>`, 400)
    const parsed = reply ? parseJson(reply.text) : null
    if (reply) await recordAi('understand', member!.id, reply).catch(() => {})
    if (parsed) return json({ intent: intentFrom(parsed, simple), source: 'ai' })
  }
  return json({ intent: localIntent(simple), source: 'simple' })
}
