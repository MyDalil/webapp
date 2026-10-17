import { currentMember } from '@/modules/membres'
import { INTENT_SYSTEM, intentFrom, localIntent, parseJson, withDefaults } from '@/modules/recherche'
import { WILAYAS } from '@/platform/referentiel/catalog'
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
  // Contexte autorisé : page consultée et wilaya choisie dans l’en-tête (facultative).
  const wilaya = WILAYAS.find((w) => w.code === Number(b.wilaya))?.name ?? null
  const page = clean(b.page, 120)
  const member = await currentMember()
  const gate = await aiGate(member)
  if (gate.ok) {
    const ctx = [page && `Page consultée : ${page}.`, wilaya && `Wilaya choisie par la personne : ${wilaya} (à utiliser si la demande ne précise aucun lieu).`].filter(Boolean).join(' ')
    const reply = await callClaude(INTENT_SYSTEM, `${ctx ? `<contexte>${ctx.replace(/<\/?contexte>/g, '')}</contexte>\n` : ''}<demande>${text.replace(/<\/?demande>/g, '')}</demande>`, 400)
    const parsed = reply ? withDefaults(parseJson(reply.text), { wilaya }) : null
    if (reply) await recordAi('understand', member!.id, reply).catch(() => {})
    if (parsed) return json({ intent: intentFrom(parsed, simple), source: 'ai' })
  }
  return json({ intent: localIntent(simple, { wilaya }), source: 'simple' })
}
