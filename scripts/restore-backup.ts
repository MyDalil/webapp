// Restauration d’une sauvegarde dans une base au même schéma (d’abord : pnpm payload migrate).
// Source : dossier local, ou URL Blob du dossier du jour (fichiers listés dans le manifeste).
// Usage : DALIL_DATABASE_URL=… PAYLOAD_SECRET=… pnpm exec tsx scripts/restore-backup.ts <dossier | préfixe d’URL>
// ⚠ Vide puis remplit les tables : jamais sur la production sans sauvegarde du moment (règle 6).
import { readFileSync } from 'node:fs'
import path from 'node:path'
import pg from 'pg'
import { backupSecret, restore } from '../src/platform/backup/core'

const src = process.argv[2]
if (!src) throw new Error('Indiquez le dossier ou le préfixe d’URL de la sauvegarde.')
const get = async (name: string) =>
  /^https?:\/\//.test(src) ? Buffer.from(await (await fetch(`${src.replace(/\/$/, '')}/${name}`)).arrayBuffer()) : readFileSync(path.join(src, name))
const db = new pg.Client({ connectionString: process.env.DALIL_DATABASE_URL })
await db.connect()
const m = await restore((t, p) => db.query(t, p), backupSecret(), get)
console.log(`Restauré : sauvegarde du ${m.at}, ${Object.keys(m.counts).length} tables, ${Object.values(m.counts).reduce((a, b) => a + b, 0)} lignes`)
await db.end()
