import 'server-only'
import { list, put } from '@vercel/blob'
import { payload } from '@/platform/http'
import { backup, backupSecret, type Query } from './core'

type Db = { pool: { query: Query } }
const KEEP_DAYS = 30

/** Sauvegarde quotidienne (tâche /api/taches) vers Vercel Blob `backups/AAAA-MM-JJ/`, 30 jours gardés. */
export async function dailyBackup() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return { ignoree: 'BLOB_READ_WRITE_TOKEN absent' }
  const p = await payload()
  const day = new Date().toISOString().slice(0, 10)
  const prefix = `backups/${process.env.VERCEL_ENV ?? 'local'}/${day}/`
  const q: Query = (text, params) => (p.db as unknown as Db).pool.query(text, params)
  const counts = await backup(q, backupSecret(), async (name, data) => {
    await put(prefix + name, data, { access: 'public', addRandomSuffix: true, contentType: 'application/octet-stream' })
  })
  // Ménage : dossiers de plus de 30 jours supprimés.
  const limit = new Date(Date.now() - KEEP_DAYS * 864e5).toISOString().slice(0, 10)
  const { blobs } = await list({ prefix: `backups/${process.env.VERCEL_ENV ?? 'local'}/` })
  const old = blobs.filter((b) => (b.pathname.split('/')[2] ?? '9') < limit).map((b) => b.url)
  if (old.length) await (await import('@vercel/blob')).del(old)
  return { dossier: prefix, tables: Object.keys(counts).length, lignes: Object.values(counts).reduce((a, b) => a + b, 0), supprimes: old.length }
}
