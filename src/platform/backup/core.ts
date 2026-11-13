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

export const sha256 = (b: Buffer) => createHash('sha256').update(b).digest('hex')

/** Empreinte publique de la clé : dit si une sauvegarde est lisible avec le secret du moment, sans le révéler. */
export const keyId = (secret: string) => sha256(key(secret)).slice(0, 12)

/** Manifeste : date, lignes par table, nom exact et empreinte de chaque fichier, empreinte de la clé. */
export type Manifest = { at: string; version: 2; keyId: string; counts: Record<string, number>; files: Record<string, { name: string; sha256: string; bytes: number }> }

/**
 * Exporte chaque table dans un instantané transactionnel commun (REPEATABLE READ, lecture seule) : toutes les tables
 * sont lues au même instant, même si la base change pendant l’export. `q` doit donc utiliser une seule connexion.
 * `put` range le fichier sous un nom déterministe (Blob ou disque). Renvoie le manifeste.
 */
export async function backup(q: Query, secret: string, put: (name: string, data: Buffer) => Promise<void>): Promise<Manifest> {
  const counts: Record<string, number> = {}
  const files: Manifest['files'] = {}
  await q('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
  try {
    for (const t of await tables(q)) {
      const list = await columns(q, t)
      const { rows } = await q(`SELECT COALESCE(json_agg(x), '[]'::json) AS data FROM (SELECT ${list} FROM "${t}") x`)
      const data = rows[0].data as unknown[]
      counts[t] = data.length
      const file = seal(secret, Buffer.from(JSON.stringify(data)))
      const name = `${t}.json.enc`
      await put(name, file)
      files[t] = { name, sha256: sha256(file), bytes: file.length }
    }
    await q('COMMIT')
  } catch (e) {
    await q('ROLLBACK').catch(() => {})
    throw e
  }
  const manifest: Manifest = { at: new Date().toISOString(), version: 2, keyId: keyId(secret), counts, files }
  await put('manifest.json.enc', seal(secret, Buffer.from(JSON.stringify(manifest))))
  return manifest
}

/**
 * Restaure dans une base au même schéma (migrée, vide ou non) : tables vidées puis remplies, contraintes différées,
 * séquences recalées. `get` lit un fichier par nom.
 */
export async function restore(q: Query, secret: string, get: (name: string) => Promise<Buffer>) {
  let manifest: Partial<Manifest> & { at: string; counts: Record<string, number> }
  try {
    manifest = JSON.parse(open(secret, await get('manifest.json.enc')).toString())
  } catch {
    throw new Error(`Manifeste illisible : mauvaise clé (clé du moment : ${keyId(secret)}) ou fichier absent.`)
  }
  const names = Object.keys(manifest.counts)
  // Tous les fichiers sont lus et contrôlés avant de toucher à la base.
  const blobs = new Map<string, Buffer>()
  for (const t of names) {
    const ref = manifest.files?.[t]
    const file = await get(ref?.name ?? `${t}.json.enc`)
    if (ref && sha256(file) !== ref.sha256) throw new Error(`Fichier ${ref.name} altéré ou incomplet (empreinte différente).`)
    blobs.set(t, file)
  }
  await q('BEGIN')
  try {
    await q(`SET LOCAL session_replication_role = replica`)
    await q(`TRUNCATE ${names.map((t) => `"${t}"`).join(', ')} CASCADE`)
    for (const t of names) {
      const rows = JSON.parse(open(secret, blobs.get(t)!).toString()) as Record<string, unknown>[]
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

/**
 * Secret de chiffrement des sauvegardes, par ordre de priorité :
 * 1. BACKUP_SECRET — secret dédié, à conserver hors de Vercel (coffre de l’équipe) : recommandé ;
 * 2. PAYLOAD_SECRET ;
 * 3. dérivé de l’URL de la base (ancien fonctionnement : changer le mot de passe Neon rend les anciennes sauvegardes illisibles).
 * Rotation : garder l’ancien secret tant que des sauvegardes chiffrées avec lui existent (30 jours). Voir platform/AGENTS.md.
 */
export function backupSecret() {
  const url = process.env.DALIL_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL || ''
  const s = process.env.BACKUP_SECRET || process.env.PAYLOAD_SECRET || (url ? createHash('sha256').update(`dalil:${url}`).digest('hex') : '')
  if (!s) throw new Error('BACKUP_SECRET, PAYLOAD_SECRET ou DALIL_DATABASE_URL requis.')
  return s
}
