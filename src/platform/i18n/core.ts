/**
 * Traduction des contenus publics (fonctions pures, testées).
 * Règle (AGENTS.md « Langues ») : noms, adresses et horaires jamais traduits.
 * Une traduction est stockée dans la collection `translations` avec l’empreinte du texte source (sourceHash) :
 * tant que le texte français ne change pas, rien n’est retraduit.
 */
import { createHash } from 'crypto'

export type TargetLang = 'en' | 'ar'
export const TARGET_LANGS: readonly TargetLang[] = ['en', 'ar']

/** Champs texte publics traduisibles, par collection (champs de premier niveau). */
export const TRANSLATABLE: Record<string, readonly string[]> = {
  places: ['intro'],
  practitioners: ['title', 'bio', 'payment'],
  providers: ['bio', 'payment'],
  classifieds: ['title', 'description'],
  procedures: ['title', 'summary', 'cost', 'delay', 'where'],
}

/** Jamais traduits, quelle que soit la collection. */
export const NEVER_TRANSLATED = new Set(['name', 'nameAr', 'nameEn', 'displayName', 'cabinetName', 'authorName', 'address', 'place', 'city', 'commune', 'wilaya', 'hours', 'slug', 'phone', 'whatsapp', 'email', 'website'])

export const translatableFields = (collection: string) => (TRANSLATABLE[collection] ?? []).filter((f) => !NEVER_TRANSLATED.has(f))

/** Empreinte du texte source (espaces normalisés). */
export const sourceHash = (text: string) => createHash('sha256').update(text.replace(/\s+/g, ' ').trim()).digest('hex').slice(0, 32)

export type TranslationRow = { id?: number | string; collection?: string; docId: string | number; field: string; lang: string; text?: string | null; sourceHash?: string | null; status?: string | null }

/**
 * Superpose les traductions sur des documents (copie, l’original n’est pas modifié).
 * Une traduction n’est appliquée que si son empreinte correspond au texte français actuel (sinon : français, jamais une traduction périmée).
 */
export function overlay<T extends { id?: string | number | null }>(docs: T[], collection: string, lang: string, rows: TranslationRow[]): T[] {
  if (lang === 'fr') return docs
  const fields = new Set(translatableFields(collection))
  const by = new Map<string, TranslationRow>()
  for (const r of rows) if (r.lang === lang && fields.has(r.field) && (!r.collection || r.collection === collection)) by.set(`${r.docId}|${r.field}`, r)
  return docs.map((d) => {
    if (!d || d.id == null) return d
    let out: T | null = null
    for (const f of fields) {
      const r = by.get(`${d.id}|${f}`)
      const src = (d as Record<string, unknown>)[f]
      if (!r?.text || typeof src !== 'string' || !src.trim()) continue
      if (r.sourceHash && r.sourceHash !== sourceHash(src)) continue
      out = out ?? { ...d }
      ;(out as Record<string, unknown>)[f] = r.text
    }
    return out ?? d
  })
}

/** Champs à (re)traduire : texte non vide, sans traduction à jour pour cette langue. */
export function pendingFields(doc: Record<string, unknown>, collection: string, lang: TargetLang, existing: TranslationRow[]) {
  return translatableFields(collection).flatMap((field) => {
    const text = doc[field]
    if (typeof text !== 'string' || !text.trim()) return []
    const hash = sourceHash(text)
    const cur = existing.find((r) => r.field === field && r.lang === lang)
    return cur?.sourceHash === hash && cur.text ? [] : [{ field, text, hash, existingId: cur?.id }]
  })
}

/**
 * Chemin public (sans langue) d’une fiche traduisible : table de correspondance du socle, sans importer de module.
 * Null si le document n’a pas de quoi construire le chemin (slug, catégorie).
 */
const PUBLIC_PATH: Record<string, (d: Record<string, unknown>) => string | null> = {
  places: (d) => (d.slug ? `/adresses/${d.slug}` : null),
  practitioners: (d) => (d.slug ? `/praticiens/${d.slug}` : null),
  providers: (d) => (d.slug ? `/prestataires/${d.slug}` : null),
  classifieds: (d) => (d.slug && d.category ? `/annonces/${d.category}/${d.slug}` : null),
  procedures: (d) => (d.slug ? `/demarches/${d.slug}` : null),
}
export const publicPath = (collection: string, doc: Record<string, unknown> | null | undefined): string | null => (doc ? (PUBLIC_PATH[collection]?.(doc) ?? null) : null)

/** Pages à rafraîchir après l’enregistrement de traductions : /en/… et /ar/… (le français ne change pas). */
export const translatedPaths = (collection: string, doc: Record<string, unknown> | null | undefined, langs: readonly TargetLang[] = TARGET_LANGS): string[] => {
  const path = publicPath(collection, doc)
  return path ? langs.map((l) => `/${l}${path}`) : []
}

/** Champ d’état de publication par collection traduisible. */
export const STATUS_FIELD: Record<string, '_status' | 'status'> = { places: '_status', practitioners: 'status', providers: 'status', classifieds: 'status', procedures: 'status' }

/** Une fiche a-t-elle au moins un champ sans traduction à jour, dans l’une des langues cibles ? */
export const needsTranslation = (doc: Record<string, unknown>, collection: string, existing: TranslationRow[]) =>
  TARGET_LANGS.some((l) => pendingFields(doc, collection, l, existing.filter((r) => String(r.docId) === String(doc.id))).length > 0)

export const LANG_NAME: Record<TargetLang, string> = { en: 'anglais', ar: 'arabe standard moderne' }

/** Consigne courte pour Claude Haiku. */
export const translatePrompt = (lang: TargetLang) =>
  `Tu traduis un texte du français vers l’${LANG_NAME[lang]} pour un guide pratique de l’Algérie. Traduction fidèle et naturelle : n’ajoute rien, n’omets rien, n’invente rien. Garde tels quels les noms propres, adresses, horaires, numéros, prix et liens. Réponds uniquement par la traduction, sans guillemets ni commentaire.`
