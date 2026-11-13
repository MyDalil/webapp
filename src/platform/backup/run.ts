import 'server-only'
import { del, list, put } from '@vercel/blob'
import { payload } from '@/platform/http'
import { backup, backupSecret, type Query } from './core'


type Client = { query: Query; release: () => void }
type Db = { pool: { connect: () => Promise<Client> } }
const KEEP_DAYS = 30

/**
 * Sauvegarde quotidienne (tâche /api/taches) vers Vercel Blob `backups/<env>/<AAAA-MM-JJ>/<table>.json.enc`, 30 jours gardés.
 * Noms déterministes (sans suffixe aléatoire) : le dossier se restaure par son URL. Manifeste = noms exacts + empreintes.
 */
export async function dailyBackup() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return { ignoree: 'BLOB_READ_WRITE_TOKEN absent' }
  const p = await payload()
  const env = process.env.VERCEL_ENV ?? 'local'
  const day = new Date().toISOString().slice(0, 10)
  const prefix = `backups/${env}/${day}/`
  const client = await (p.db as unknown as Db).pool.connect()
  let manifest
  let base = ''
  try {
    manifest = await backup((text, params) => client.query(text, params), backupSecret(), async (name, data) => {
      const blob = await put(prefix + name, data, { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/octet-stream' })
      if (name === 'manifest.json.enc') base = blob.url.slice(0, -name.length)
    })
  } finally {
    client.release()
  }
  // Ménage : dossiers de plus de 30 jours supprimés, toutes les pages de la liste parcourues.
  const limit = new Date(Date.now() - KEEP_DAYS * 864e5).toISOString().slice(0, 10)
  const old: string[] = []
  let cursor: string | undefined
  do {
    const page = await list({ prefix: `backups/${env}/`, cursor, limit: 1000 })
    for (const b of page.blobs) if ((b.pathname.split('/')[2] ?? '9') < limit) old.push(b.url)
    cursor = page.hasMore ? page.cursor : undefined
  } while (cursor)
  for (let i = 0; i < old.length; i += 500) await del(old.slice(i, i + 500))
  return { dossier: prefix, url: base, cle: manifest.keyId, tables: Object.keys(manifest.counts).length, lignes: Object.values(manifest.counts).reduce((a, b) => a + b, 0), supprimes: old.length }
}
