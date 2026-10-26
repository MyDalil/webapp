import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

/**
 * Index de recherche commun (table `search_index`, Neon) : une ligne par contenu public, tous métiers confondus.
 * Sans accent (`dalil_unaccent`), plein texte français (`tsv`), fautes tolérées (trigrammes).
 * Chaque métier construit ses lignes (il connaît ses libellés) ; le socle les écrit et les interroge.
 */
export type SearchType = 'rubrique' | 'categorie' | 'adresse' | 'praticien' | 'prestataire' | 'annonce' | 'guide'
export type SearchRow = {
  type: SearchType
  id: string
  url: string
  title: string
  subtitle?: string | null
  /** Code de wilaya (« 16 »), ou rien si le contenu vaut pour tout le pays. */
  wilaya?: string | null
  /** Texte cherché : libellés, catégories, lieux, synonymes. */
  text: string
  /** Bonus de classement (exemples : négatif). */
  boost?: number
  badge?: string | null
}
export type SearchHit = SearchRow & { score: number }

type Db = { execute: (q: ReturnType<typeof sql>) => Promise<{ rows: Record<string, unknown>[] }> }
const dbOf = (payload: Payload) => (payload.db as unknown as { drizzle: Db }).drizzle

const clip = (s: string | null | undefined, n: number) => (s ?? '').replace(/\s+/g, ' ').trim().slice(0, n)

/** Mots d’une recherche, sans accent ni ponctuation : la même règle qu’en base. */
export const searchWords = (q: string) =>
  q
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(' ')
    .filter((w) => w.length > 1)
    .slice(0, 8)

function values(rows: SearchRow[]) {
  return sql.join(
    rows.map(
      (r) =>
        sql`(${r.type}, ${r.id}, ${clip(r.url, 300)}, ${clip(r.title, 200)}, ${clip(r.subtitle, 200) || null}, ${r.wilaya ?? null}, ${r.boost ?? 0}, ${clip(r.badge, 40) || null}, ${clip(r.text, 4000)})`,
    ),
    sql`, `,
  )
}

const UPSERT_TAIL = sql`
  ON CONFLICT (type, id) DO UPDATE SET url = EXCLUDED.url, title = EXCLUDED.title, subtitle = EXCLUDED.subtitle, wilaya = EXCLUDED.wilaya,
    boost = EXCLUDED.boost, badge = EXCLUDED.badge, body = EXCLUDED.body, updated_at = now()`

/** Ajoute ou met à jour des lignes (par lots de 500). */
export async function indexRows(payload: Payload, rows: SearchRow[]) {
  const db = dbOf(payload)
  for (let i = 0; i < rows.length; i += 500) {
    const part = rows.slice(i, i + 500)
    if (part.length) await db.execute(sql`INSERT INTO search_index (type, id, url, title, subtitle, wilaya, boost, badge, body) VALUES ${values(part)} ${UPSERT_TAIL}`)
  }
}

export async function removeRow(payload: Payload, type: SearchType, id: string | number) {
  await dbOf(payload).execute(sql`DELETE FROM search_index WHERE type = ${type} AND id = ${String(id)}`)
}

/** Reconstruit tout un type : les lignes absentes de `rows` sont retirées. */
export async function replaceType(payload: Payload, type: SearchType, rows: SearchRow[]) {
  const stamp = new Date().toISOString()
  await indexRows(payload, rows)
  await dbOf(payload).execute(sql`DELETE FROM search_index WHERE type = ${type} AND updated_at < ${stamp}::timestamptz`)
}

/**
 * Recherche : plein texte français par préfixes (« hopit » trouve « Hôpitaux »), sinon trigrammes (« plombier » trouve « Plomberie »).
 * `wilaya` : contenus de cette wilaya et contenus nationaux.
 */
export async function querySearch(payload: Payload, q: string, opts: { wilaya?: string | null; types?: SearchType[]; limit?: number } = {}): Promise<SearchHit[]> {
  const words = searchWords(q)
  if (!words.length) return []
  const phrase = words.join(' ')
  const all = words.map((w) => `${w}:*`).join(' & ')
  const some = words.map((w) => `${w}:*`).join(' | ')
  const limit = Math.min(opts.limit ?? 40, 200)
  const wilaya = opts.wilaya ?? null
  const types = opts.types?.length ? sql`AND type IN (${sql.join(opts.types.map((t) => sql`${t}`), sql`, `)})` : sql``
  const run = async (tsq: string) =>
    (
      await dbOf(payload).execute(sql`
        WITH q AS (SELECT to_tsquery('french', ${tsq}) AS tq, ${phrase}::text AS p)
        SELECT type, id, url, title, subtitle, wilaya, boost, badge,
          (ts_rank(tsv, q.tq) * 4 + similarity(title_norm, q.p) * 2 + word_similarity(q.p, norm) + boost
            + CASE WHEN ${wilaya}::text IS NOT NULL AND wilaya = ${wilaya}::text THEN 0.5 ELSE 0 END) AS score
        FROM search_index, q
        WHERE (tsv @@ q.tq OR title_norm % q.p OR q.p <% norm)
          AND (${wilaya}::text IS NULL OR wilaya IS NULL OR wilaya = ${wilaya}::text) ${types}
        ORDER BY score DESC
        LIMIT ${limit}`)
    ).rows
  let rows = await run(all)
  if (!rows.length && words.length > 1) rows = await run(some)
  return rows.map((r) => ({
    type: r.type as SearchType,
    id: String(r.id),
    url: String(r.url),
    title: String(r.title),
    subtitle: (r.subtitle as string) ?? null,
    wilaya: (r.wilaya as string) ?? null,
    text: '',
    boost: Number(r.boost),
    badge: (r.badge as string) ?? null,
    score: Number(r.score),
  }))
}
