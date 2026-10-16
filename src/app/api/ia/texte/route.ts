import { currentMember } from '@/modules/membres'
import { MAX_INPUT_CHARS, aiGate, aiReformulate, recordAi, simpleClean } from '@/platform/ai'
import { clean, fail, json } from '@/platform/http'
import { guard } from '@/platform/security/rateLimit'

const NOTICE = {
  account: 'Reformulation par l’IA réservée aux comptes connectés : texte nettoyé simplement.',
  quota: 'Quota du jour atteint (20 reformulations) : texte nettoyé simplement.',
  budget: 'Reformulation momentanément indisponible : texte nettoyé simplement.',
  off: null,
} as const

/**
 * Nettoyage d’un texte (dictée) ou amélioration à la demande (✦). Reformulation par l’IA pour les comptes vérifiés,
 * dans les limites du quota et du plafond mensuel ; sinon nettoyage simple, sans coût.
 */
export async function POST(req: Request) {
  const limited = await guard('ia-texte', 60, 3600)
  if (limited) return limited
  const b = await req.json().catch(() => ({}))
  const mode = b.mode === 'improve' ? 'improve' : 'dictation'
  const text = clean(b.text, 4000)
  if (!text) return json({ text: '', source: 'simple' })
  const simple = simpleClean(text, { sentence: b.sentence === true })
  if (text.length > MAX_INPUT_CHARS) return json({ text: simple, source: 'simple', notice: mode === 'improve' ? `Amélioration limitée à ${MAX_INPUT_CHARS} caractères : texte nettoyé simplement.` : null })
  const member = await currentMember()
  const gate = await aiGate(member)
  if (!gate.ok) {
    if (mode === 'improve' && gate.reason === 'account') return fail('Connectez-vous pour améliorer votre texte avec DALIL.', 401)
    return json({ text: simple, source: 'simple', notice: NOTICE[gate.reason] })
  }
  const r = await aiReformulate(text)
  if (!r) return json({ text: simple, source: 'simple', notice: null })
  await recordAi('reformulate', member!.id, r.reply).catch(() => {})
  return json({ text: r.text, source: 'ai', remaining: gate.remaining })
}
