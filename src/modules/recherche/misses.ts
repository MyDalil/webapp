import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

/**
 * Recherches sans résultat : ce que les visiteurs cherchent et que DALIL n’a pas encore.
 * Texte normalisé seulement ; aucune donnée sur la personne. Une requête qui contient un email
 * ou un numéro (téléphone, pièce) n’est jamais gardée. Conservation : 90 jours.
 */
type Db = { drizzle: { execute: (q: unknown) => Promise<{ rows: Record<string, unknown>[] }> } }
const db = (p: Payload) => (p.db as unknown as Db).drizzle
export const MISS_DAYS = 90
/** Plafond de lignes : protège la base contre un remplissage par des recherches inventées. */
export const MAX_ROWS = 20_000

export function normalizeMiss(q: string): string | null {
  const s = q.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 120)
  if (s.length < 2) return null
  if (s.includes('@') || /\d{6,}/.test(s.replace(/[\s.()+-]/g, ''))) return null
  return s
}

export async function recordMiss(p: Payload, q: string) {
  const s = normalizeMiss(q)
  if (!s) return false
  // Une recherche déjà notée augmente son compteur ; une nouvelle n’entre que sous le plafond de lignes.
  const r = await db(p).execute(sql`INSERT INTO search_misses (q, count, first_at, last_at)
    SELECT ${s}, 1, now(), now() WHERE EXISTS (SELECT 1 FROM search_misses WHERE q = ${s}) OR (SELECT COUNT(*) FROM search_misses) < ${MAX_ROWS}
    ON CONFLICT (q) DO UPDATE SET count = search_misses.count + 1, last_at = now() RETURNING q`)
  return r.rows.length > 0
}

export async function listMisses(p: Payload, days = 30, limit = 100) {
  const { rows } = await db(p).execute(sql`SELECT q, count, last_at FROM search_misses WHERE last_at > now() - make_interval(days => ${days}) ORDER BY count DESC, last_at DESC LIMIT ${limit}`)
  return rows.map((r) => ({ q: String(r.q), count: Number(r.count), lastAt: String(r.last_at) }))
}

export async function purgeMisses(p: Payload) {
  const { rows } = await db(p).execute(sql`DELETE FROM search_misses WHERE last_at < now() - make_interval(days => ${MISS_DAYS}) RETURNING q`)
  return { supprimees: rows.length }
}
