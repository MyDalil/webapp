// Copie unique de l'ancienne base (DATABASE_URL) vers la base DALIL (DALIL_DATABASE_URL).
// Lancé au build Vercel, après `payload migrate`. Ne fait rien si la base DALIL contient déjà un compte.
import pg from 'pg'

const source = process.env.DATABASE_URL
const target = process.env.DALIL_DATABASE_URL_UNPOOLED || process.env.DALIL_DATABASE_URL
if (!source || !target || source === target) {
  console.log('[copy-legacy-db] rien à copier')
  process.exit(0)
}

// Tables métier ; les données de test de la mise en ligne sont écartées.
const TABLES = [
  ['users', ''],
  ['subscribers', `where email <> 'test-claude@mydalil.com'`],
  ['submissions', `where subject not like 'TEST CLAUDE%'`],
]

const src = new pg.Client({ connectionString: source })
const dst = new pg.Client({ connectionString: target })
await src.connect()
await dst.connect()
try {
  const { rows } = await dst.query('select count(*)::int as n from users')
  if (rows[0].n > 0) {
    console.log('[copy-legacy-db] base DALIL déjà remplie, copie ignorée')
  } else {
    await dst.query('begin')
    for (const [table, where] of TABLES) {
      const cols = (
        await dst.query(
          `select column_name from information_schema.columns where table_schema = 'public' and table_name = $1`,
          [table],
        )
      ).rows.map((r) => r.column_name)
      const data = (await src.query(`select ${cols.map((c) => `"${c}"`).join(', ')} from "${table}" ${where}`)).rows
      for (const row of data) {
        const vals = cols.map((c) => (row[c] !== null && typeof row[c] === 'object' && !(row[c] instanceof Date) && !Array.isArray(row[c]) ? JSON.stringify(row[c]) : row[c]))
        await dst.query(
          `insert into "${table}" (${cols.map((c) => `"${c}"`).join(', ')}) values (${cols.map((_, i) => `$${i + 1}`).join(', ')})`,
          vals,
        )
      }
      await dst.query(
        `select setval(pg_get_serial_sequence('"${table}"', 'id'), coalesce((select max(id) from "${table}"), 0) + 1, false)`,
      )
      console.log(`[copy-legacy-db] ${table} : ${data.length} ligne(s)`)
    }
    await dst.query('commit')
  }
} catch (e) {
  await dst.query('rollback').catch(() => {})
  console.error('[copy-legacy-db] échec, la base DALIL reste vide :', e.message)
  process.exitCode = 0 // ne bloque pas la mise en ligne
} finally {
  await src.end()
  await dst.end()
}
