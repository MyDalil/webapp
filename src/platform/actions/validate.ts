import type { JsonSchema } from './types'

/**
 * Validation simple d’une entrée d’action d’après son JSON Schema (sous-ensemble : type, required, enum, maxLength,
 * minimum, maximum, items). Les champs inconnus sont retirés, jamais transmis à l’action.
 */
export type Validation = { ok: true; value: Record<string, unknown> } | { ok: false; error: string }

type Prop = { type?: string | string[]; enum?: unknown[]; maxLength?: number; minimum?: number; maximum?: number; items?: Prop; maxItems?: number }

const typeOf = (v: unknown) => (v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v)

function matches(v: unknown, type: string) {
  const t = typeOf(v)
  if (type === 'number') return t === 'number' || t === 'integer'
  return t === type
}

function check(name: string, v: unknown, p: Prop): string | null {
  const types = p.type === undefined ? [] : Array.isArray(p.type) ? p.type : [p.type]
  if (types.length && !types.some((t) => matches(v, t))) return `« ${name} » doit être de type ${types.join(' ou ')}.`
  if (p.enum && !p.enum.includes(v)) return `« ${name} » doit valoir : ${p.enum.map(String).join(', ')}.`
  if (typeof v === 'string' && typeof p.maxLength === 'number' && v.length > p.maxLength) return `« ${name} » dépasse ${p.maxLength} caractères.`
  if (typeof v === 'number' && typeof p.minimum === 'number' && v < p.minimum) return `« ${name} » doit être au moins ${p.minimum}.`
  if (typeof v === 'number' && typeof p.maximum === 'number' && v > p.maximum) return `« ${name} » doit être au plus ${p.maximum}.`
  if (Array.isArray(v)) {
    if (typeof p.maxItems === 'number' && v.length > p.maxItems) return `« ${name} » contient plus de ${p.maxItems} éléments.`
    if (p.items) for (const [i, x] of v.entries()) {
      const e = check(`${name}[${i}]`, x, p.items)
      if (e) return e
    }
  }
  return null
}

export function validateInput(schema: JsonSchema, input: unknown): Validation {
  const raw = input === undefined || input === null ? {} : input
  if (typeOf(raw) !== 'object') return { ok: false, error: 'L’entrée doit être un objet JSON.' }
  const obj = raw as Record<string, unknown>
  const props = (schema.properties ?? {}) as Record<string, Prop>
  const required = (schema.required ?? []) as string[]
  const value: Record<string, unknown> = {}
  for (const k of required) {
    const v = obj[k]
    if (v === undefined || v === null || (typeof v === 'string' && !v.trim())) return { ok: false, error: `« ${k} » est obligatoire.` }
  }
  for (const [k, p] of Object.entries(props)) {
    const v = obj[k]
    if (v === undefined || v === null) continue
    const e = check(k, v, p)
    if (e) return { ok: false, error: e }
    value[k] = typeof v === 'string' ? v.trim() : v
  }
  return { ok: true, value }
}
