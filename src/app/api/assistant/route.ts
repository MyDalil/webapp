import { fail, json } from '@/platform/http'
import { isLang } from '@/platform/i18n'
import { clientId, hit } from '@/platform/security/rateLimit'
import { ASSISTANT_DAILY_PER_VISITOR, askFiche, cleanQuestion } from '@/modules/pros'

/** Assistant d’une fiche Premium : une question (300 caractères), une réponse tirée des données publiées de la fiche. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { c?: unknown; i?: unknown; q?: unknown; lang?: unknown } | null
  const collection = body?.c
  const id = typeof body?.i === 'number' ? String(body.i) : body?.i
  if ((collection !== 'places' && collection !== 'practitioners' && collection !== 'providers') || typeof id !== 'string' || !/^[1-9]\d{0,11}$/.test(id)) return fail('Fiche inconnue.')
  const question = cleanQuestion(body?.q)
  if (!question) return fail('Posez une question de 3 à 300 caractères.')
  const lang = typeof body?.lang === 'string' && isLang(body.lang) ? body.lang : 'fr'
  const who = await clientId()
  const r = await askFiche(collection, id, question, lang, () => hit('assistant', who, ASSISTANT_DAILY_PER_VISITOR, 24 * 3600))
  if (!r.ok) return fail(r.error, r.status)
  return json({ answer: r.answer })
}
