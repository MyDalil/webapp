// Sauvegarde de la base vers un dossier local (mêmes fichiers chiffrés que la sauvegarde quotidienne Blob).
// Usage : DALIL_DATABASE_URL=… PAYLOAD_SECRET=… pnpm exec tsx scripts/backup.ts <dossier>
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import pg from 'pg'
import { backup, backupSecret } from '../src/platform/backup/core'

const dir = process.argv[2] ?? 'sauvegarde'
mkdirSync(dir, { recursive: true })
const db = new pg.Client({ connectionString: process.env.DALIL_DATABASE_URL })
await db.connect()
const counts = await backup((t, p) => db.query(t, p), backupSecret(), async (name, data) => writeFileSync(path.join(dir, name), data))
console.log(`Sauvegarde dans ${dir} : ${Object.keys(counts).length} tables, ${Object.values(counts).reduce((a, b) => a + b, 0)} lignes`)
await db.end()
