import 'server-only'
import type { Payload } from 'payload'
import { revalidatePath } from 'next/cache'
import { callClaude } from '@/platform/ai/claude'
import { recordAi, staffAiGate } from '@/platform/ai/budget'
import { pendingFields, translatePrompt, translatableFields, translatedPaths, TARGET_LANGS, type TargetLang } from './core'

export type TranslateResult = {
  collection: string
  id: string
  traduits: { field: string; lang: TargetLang }[]
  inchanges: number
  arret?: 'ia-non-configuree' | 'plafond-atteint' | 'echec-ia'
}

/** Longueur maximale traduite par champ (les présentations font au plus 1 500 caractères). */
const MAX_CHARS = 4000

/** Rafraîchit les pages /en et /ar de la fiche ; hors contexte Next (CLI, scripts), rien à rafraîchir. */
export function refreshTranslated(collection: string, doc: Record<string, unknown>, langs: readonly TargetLang[]) {
  for (const p of translatedPaths(collection, doc, langs)) {
    try {
      revalidatePath(p)
    } catch {
      return
    }
  }
}

/**
 * Traduit les champs texte publics d’une fiche du français vers l’anglais et l’arabe (Claude Haiku).
 * Ne retraduit pas un champ dont le texte source n’a pas changé (sourceHash). Statut « auto ».
 * S’arrête net au plafond mensuel de l’IA. Jamais de traduction des noms, adresses ni horaires.
 */
export async function translateDoc(payload: Payload, collection: string, id: string | number, langs: readonly TargetLang[] = TARGET_LANGS): Promise<TranslateResult> {
  const out: TranslateResult = { collection, id: String(id), traduits: [], inchanges: 0 }
  if (!translatableFields(collection).length) return out
  // Collection choisie à l’exécution (une des collections traduisibles) : le type exact n’est pas connu ici.
  const doc = (await payload.findByID({ collection: collection as 'places', id, depth: 0, overrideAccess: true })) as unknown as Record<string, unknown>
  try {
    return await translateFields(payload, collection, doc, langs, out)
  } finally {
    if (out.traduits.length) refreshTranslated(collection, doc, [...new Set(out.traduits.map((t) => t.lang))])
  }
}

async function translateFields(payload: Payload, collection: string, doc: Record<string, unknown>, langs: readonly TargetLang[], out: TranslateResult): Promise<TranslateResult> {
  const id = String(doc.id)
  const { docs: existing } = await payload.find({
    collection: 'translations',
    where: { and: [{ collection: { equals: collection } }, { docId: { equals: id } }] },
    limit: 50,
    depth: 0,
    overrideAccess: true,
    pagination: false,
  })
  for (const lang of langs) {
    const todo = pendingFields(doc, collection, lang, existing)
    out.inchanges += translatableFields(collection).length - todo.length
    for (const t of todo) {
      const gate = await staffAiGate()
      if (!gate.ok) {
        out.arret = gate.reason === 'off' ? 'ia-non-configuree' : 'plafond-atteint'
        return out
      }
      const r = await callClaude(translatePrompt(lang), t.text.slice(0, MAX_CHARS), Math.min(2000, Math.ceil(t.text.length * 1.5) + 100), 20000)
      if (!r?.text) {
        out.arret = 'echec-ia'
        return out
      }
      await recordAi('translate', null, r).catch(() => {})
      const data = { collection, docId: id, field: t.field, lang, text: r.text, sourceHash: t.hash, status: 'auto' as const }
      const ctx = { skipAudit: true }
      if (t.existingId != null) await payload.update({ collection: 'translations', id: t.existingId, data, overrideAccess: true, context: ctx })
      else await payload.create({ collection: 'translations', data, overrideAccess: true, context: ctx })
      out.traduits.push({ field: t.field, lang })
    }
  }
  return out
}
