import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'
import { gunzipSync, gzipSync } from 'zlib'

/**
 * Sauvegarde logique de la base : une table = un fichier JSON compressé puis chiffré (AES-256-GCM).
 * Clé dérivée du secret Payload (variable Vercel) : un fichier volé est illisible sans elle.
 * Utilisé par la tâche quotidienne (Vercel Blob) et par `scripts/backup.ts` / `scripts/restore-backup.ts`.
 */
export type Query = (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>

/** Tables techniques recréées seules : jamais sauvegardées. */
const SKIP = new Set(['rate_limits', 'payload_locked_documents', 'payload_locked_documents_rels', 'payload_preferences', 'payload_preferences_rels', 'dalil_deferred_data'])

const key = (secret: string) => createHash('sha256').update(`sauvegarde:${secret}`).digest()

export function seal(secret: string, data: Buffer): Buffer {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', key(secret), iv)
  const body = Buffer.concat([c.update(gzipSync(data)), c.final()])
  return Buffer.concat([iv, c.getAuthTag(), body])
}

export function open(secret: string, file: Buffer): Buffer {
  const d = createDecipheriv('aes-256-gcm', key(secret), file.subarray(0, 12))
  d.setAuthTag(file.subarray(12, 28))
  return gunzipSync(Buffer.concat([d.update(file.subarray(28)), d.final()]))
}

/** Colonnes écrites (les colonnes générées, ex. geom PostGIS, sont recalculées par la base). */
async function columns(q: Query, t: string) {
  const { rows } = await q(`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND is_generated = 'NEVER' ORDER BY ordinal_position`, [t])
  return rows.map((c) => `"${String(c.column_name)}"`).join(', ')
}

export async function tables(q: Query): Promise<string[]> {
  const { rows } = await q(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`)
  return rows.map((r) => String(r.tablename)).filter((t) => !SKIP.has(t) && t !== 'spatial_ref_sys')
}

/** Exporte chaque table ; `put` range le fichier (Blob ou disque). Renvoie le nombre de lignes par table. */
export async function backup(q: Query, secret: string, put: (name: string, data: Buffer) => Promise<void>) {
  const counts: Record<string, number> = {}
  for (const t of await tables(q)) {
    const list = await columns(q, t)
    const { rows } = await q(`SELECT COALESCE(json_agg(x), '[]'::json) AS data FROM (SELECT ${list} FROM "${t}") x`)
    const data = rows[0].data as unknown[]
    counts[t] = data.length
    await put(`${t}.json.enc`, seal(secret, Buffer.from(JSON.stringify(data))))
  }
  await put('manifest.json.enc', seal(secret, Buffer.from(JSON.stringify({ at: new Date().toISOString(), counts }))))
  return counts
}

/**
 * Restaure dans une base au même schéma (migrée, vide ou non) : tables vidées puis remplies, contraintes différées,
 * séquences recalées. `get` lit un fichier par nom.
 */
export async function restore(q: Query, secret: string, get: (name: string) => Promise<Buffer>) {
  const manifest = JSON.parse(open(secret, await get('manifest.json.enc')).toString()) as { at: string; counts: Record<string, number> }
  const names = Object.keys(manifest.counts)
  await q('BEGIN')
  try {
    await q(`SET LOCAL session_replication_role = replica`)
    await q(`TRUNCATE ${names.map((t) => `"${t}"`).join(', ')} CASCADE`)
    for (const t of names) {
      const rows = JSON.parse(open(secret, await get(`${t}.json.enc`)).toString()) as Record<string, unknown>[]
      const list = await columns(q, t)
      for (let i = 0; i < rows.length; i += 2000) {
        await q(`INSERT INTO "${t}" (${list}) SELECT ${list} FROM json_populate_recordset(NULL::"${t}", $1::json)`, [JSON.stringify(rows.slice(i, i + 2000))])
      }
    }
    const { rows: seqs } = await q(`SELECT c.table_name, c.column_name, pg_get_serial_sequence('"' || c.table_name || '"', c.column_name) AS seq
      FROM information_schema.columns c WHERE c.table_schema = 'public' AND c.column_default LIKE 'nextval%'`)
    for (const s of seqs) if (s.seq && names.includes(String(s.table_name)))
      await q(`SELECT setval('${s.seq}', COALESCE((SELECT MAX("${s.column_name}") FROM "${s.table_name}"), 0) + 1, false)`)
    await q('COMMIT')
  } catch (e) {
    await q('ROLLBACK')
    throw e
  }
  return manifest
}

/** Secret de chiffrement : celui de payload.config.ts (PAYLOAD_SECRET, sinon dérivé de l’URL de la base). */
export function backupSecret() {
  const url = process.env.DALIL_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL || ''
  const s = process.env.PAYLOAD_SECRET || (url ? createHash('sha256').update(`dalil:${url}`).digest('hex') : '')
  if (!s) throw new Error('PAYLOAD_SECRET ou DALIL_DATABASE_URL requis.')
  return s
}
