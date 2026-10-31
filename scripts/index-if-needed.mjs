// Reconstruit l’index de recherche seulement si nécessaire (économie de calcul de la base) :
// données écrites en masse pendant ce build (.reindex-needed), index vide, ou SEARCH_REINDEX=1.
// Sinon l’index reste celui tenu à jour à chaque enregistrement.
import { existsSync, rmSync } from 'node:fs'
import { execSync } from 'node:child_process'
import pg from 'pg'

const url = process.env.DALIL_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL || ''
let reason = process.env.SEARCH_REINDEX === '1' ? 'demande explicite (SEARCH_REINDEX=1)' : existsSync('.reindex-needed') ? 'données importées pendant ce build' : null
if (!reason) {
  const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 15000 })
  try {
    await client.connect()
    const r = await client.query("select count(*)::int as n from search_index where type = 'adresse'").catch(() => ({ rows: [{ n: 0 }] }))
    if (!r.rows[0].n) reason = 'index vide'
  } finally {
    await client.end().catch(() => {})
  }
}
if (reason) {
  console.log(`Index de recherche : reconstruction (${reason}).`)
  execSync('pnpm search:index', { stdio: 'inherit' })
  rmSync('.reindex-needed', { force: true })
} else console.log('Index de recherche : déjà à jour, pas de reconstruction.')
