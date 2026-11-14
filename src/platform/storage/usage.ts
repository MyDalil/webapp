/**
 * Où une photo est utilisée, et remplacement d’une photo par une autre partout.
 * Lit le schéma Payload (champs « upload » ou « relationship » vers `media`), sans connaître les métiers :
 * la plateforme n’importe aucun module.
 * Couvre les champs simples, multiples, dans les groupes, onglets, lignes, blocs repliables et tableaux.
 * Les blocs (`blocks`) et les relations polymorphes ne sont pas couverts.
 */
type AnyField = {
  type: string
  name?: string
  relationTo?: string | string[]
  hasMany?: boolean
  fields?: AnyField[]
  tabs?: Array<{ name?: string; fields: AnyField[] }>
}
export type Ref = { collection: string; path: string; hasMany: boolean }
type Id = number | string

const isMediaField = (f: AnyField) => (f.type === 'upload' || f.type === 'relationship') && f.relationTo === 'media'

/** Champs qui pointent vers une photo, avec leur chemin de requête Payload (ex. `gallery.photos`). */
export function mediaRefs(collection: string, fields: AnyField[], prefix = ''): Ref[] {
  const out: Ref[] = []
  for (const f of fields) {
    if (isMediaField(f) && f.name) out.push({ collection, path: prefix + f.name, hasMany: Boolean(f.hasMany) })
    else if ((f.type === 'group' || f.type === 'array') && f.name && f.fields) out.push(...mediaRefs(collection, f.fields, `${prefix}${f.name}.`))
    else if ((f.type === 'row' || f.type === 'collapsible' || (f.type === 'group' && !f.name)) && f.fields) out.push(...mediaRefs(collection, f.fields, prefix))
    else if (f.type === 'tabs' && f.tabs) for (const t of f.tabs) out.push(...mediaRefs(collection, t.fields, t.name ? `${prefix}${t.name}.` : prefix))
  }
  return out
}

const idOf = (v: unknown): Id | null => (typeof v === 'number' || typeof v === 'string' ? v : v && typeof v === 'object' && 'id' in v ? (v as { id: Id }).id : null)
const same = (a: unknown, b: Id) => idOf(a) != null && String(idOf(a)) === String(b)

/** Toutes les photos citées par un document (identifiants). */
export function idsInDoc(fields: AnyField[], doc: Record<string, unknown> | null | undefined, acc: Set<string> = new Set()): Set<string> {
  if (!doc) return acc
  for (const f of fields) {
    const v = f.name ? doc[f.name] : undefined
    if (isMediaField(f) && f.name) {
      for (const x of Array.isArray(v) ? v : [v]) { const id = idOf(x); if (id != null) acc.add(String(id)) }
    } else if (f.type === 'group' && f.name && f.fields) idsInDoc(f.fields, v as Record<string, unknown>, acc)
    else if (f.type === 'array' && f.name && f.fields && Array.isArray(v)) for (const row of v) idsInDoc(f.fields, row as Record<string, unknown>, acc)
    else if ((f.type === 'row' || f.type === 'collapsible' || (f.type === 'group' && !f.name)) && f.fields) idsInDoc(f.fields, doc, acc)
    else if (f.type === 'tabs' && f.tabs) for (const t of f.tabs) idsInDoc(t.fields, t.name ? (doc[t.name] as Record<string, unknown>) : doc, acc)
  }
  return acc
}

/**
 * Remplace la photo `from` par `to` dans un document. Rend seulement les clés de premier niveau modifiées
 * (valeur complète, sœurs comprises), ou null si rien ne change. Dans un champ multiple, pas de doublon.
 */
export function replaceInDoc(fields: AnyField[], doc: Record<string, unknown>, from: Id, to: Id): Record<string, unknown> | null {
  const patch: Record<string, unknown> = {}
  const walk = (fs: AnyField[], obj: Record<string, unknown>): { value: Record<string, unknown>; changed: boolean } => {
    const next: Record<string, unknown> = { ...obj }
    let changed = false
    for (const f of fs) {
      if ((f.type === 'row' || f.type === 'collapsible' || (f.type === 'group' && !f.name)) && f.fields) {
        const r = walk(f.fields, next)
        if (r.changed) { Object.assign(next, r.value); changed = true }
        continue
      }
      if (f.type === 'tabs' && f.tabs) {
        for (const t of f.tabs) {
          if (t.name) {
            const r = walk(t.fields, (next[t.name] as Record<string, unknown>) ?? {})
            if (r.changed) { next[t.name] = r.value; changed = true }
          } else {
            const r = walk(t.fields, next)
            if (r.changed) { Object.assign(next, r.value); changed = true }
          }
        }
        continue
      }
      if (!f.name || !(f.name in next)) continue
      const v = next[f.name]
      if (isMediaField(f)) {
        if (Array.isArray(v)) {
          if (!v.some((x) => same(x, from))) continue
          const ids = v.map((x) => (same(x, from) ? to : idOf(x))).filter((x): x is Id => x != null)
          next[f.name] = ids.filter((x, i) => ids.findIndex((y) => String(y) === String(x)) === i)
          changed = true
        } else if (same(v, from)) { next[f.name] = to; changed = true }
      } else if (f.type === 'group' && f.fields && v && typeof v === 'object') {
        const r = walk(f.fields, v as Record<string, unknown>)
        if (r.changed) { next[f.name] = r.value; changed = true }
      } else if (f.type === 'array' && f.fields && Array.isArray(v)) {
        let any = false
        const rows = v.map((row) => { const r = walk(f.fields!, row as Record<string, unknown>); any ||= r.changed; return r.value })
        if (any) { next[f.name] = rows; changed = true }
      }
    }
    return { value: next, changed }
  }
  const r = walk(fields, doc)
  if (!r.changed) return null
  for (const k of Object.keys(r.value)) if (r.value[k] !== doc[k]) patch[k] = r.value[k]
  return patch
}
