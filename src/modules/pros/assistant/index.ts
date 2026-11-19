import 'server-only'
import { callClaude, recordAi, staffAiGate } from '@/platform/ai'
import { payload } from '@/platform/http'
import { planOf } from '../subscriptions'
import { isPublicCategory, type LeadTarget } from '../offreRules'
import { ASSISTANT_SYSTEM, assistantPrompt, ficheFacts } from './rules'

export { ASSISTANT_MAX_CHARS, ASSISTANT_DAILY_PER_VISITOR, cleanQuestion } from './rules'

const FALLBACK = {
  fr: 'Je n’ai pas cette information. Utilisez « Être rappelé » : l’établissement vous répondra.',
  en: 'I don’t have this information. Use “Call me back”: the business will answer you.',
  ar: 'لا تتوفر لدي هذه المعلومة. استعمل «اطلب معاودة الاتصال» وسيجيبك المحل.',
} as const

/**
 * Réponse de l’assistant d’une fiche Premium. Vérifie le plan (aucun appel IA hors Premium), le plafond mensuel global,
 * puis compte l’appel dans ai-usage (`channel`). Aucune mémoire : une question, une réponse.
 */
export async function askFiche(collection: LeadTarget, id: string, question: string, lang: 'fr' | 'en' | 'ar' = 'fr', quota?: () => Promise<number>): Promise<{ ok: true; answer: string } | { ok: false; error: string; status: number; retryAfter?: number }> {
  if ((await planOf(collection, id)) !== 'premium') return { ok: false, error: 'Assistant indisponible pour cette fiche.', status: 404 }
  const p = await payload()
  const doc = (await p.findByID({ collection, id: Number(id), depth: 0, overrideAccess: false, disableErrors: true })) as unknown as Record<string, unknown> | null
  const published = doc && (collection === 'places' ? doc._status === 'published' : doc.status === 'published')
  if (!doc || !published || doc.demo || isPublicCategory(doc.category as string)) return { ok: false, error: 'Assistant indisponible pour cette fiche.', status: 404 }
  // Quota par visiteur (5 par jour) compté seulement pour une fiche Premium : aucune écriture pour les autres.
  const wait = quota ? await quota() : 0
  if (wait) return { ok: false, error: 'Vous avez posé 5 questions aujourd’hui. Utilisez « Être rappelé » pour joindre l’établissement.', status: 429, retryAfter: wait }
  const gate = await staffAiGate().catch(() => ({ ok: false as const }))
  if (!gate.ok) return { ok: true, answer: FALLBACK[lang] }
  const reply = await callClaude(ASSISTANT_SYSTEM, assistantPrompt(ficheFacts(collection, doc), question), 250)
  if (!reply?.text) return { ok: true, answer: FALLBACK[lang] }
  await recordAi('channel', null, reply).catch(() => {})
  return { ok: true, answer: reply.text.replace(/<\/?[a-z]+>/gi, '').trim().slice(0, 900) }
}
