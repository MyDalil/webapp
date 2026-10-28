// Vérifie la base avant le build Vercel. En cas d’échec : message d’erreur exact (sans secret) publié dans Vercel Blob
// (diag/base.txt) pour être lu depuis GitHub, puis arrêt du build avec ce message.
import pg from 'pg'
import { put } from '@vercel/blob'

const url = process.env.DALIL_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL || ''
const host = (() => {
  try {
    return new URL(url).hostname.replace(/^[^.]+/, '…')
  } catch {
    return 'adresse absente'
  }
})()
const report = async (lines) => {
  const text = [`Relevé : ${new Date().toISOString()}`, `Environnement : ${process.env.VERCEL_ENV ?? 'local'} · commit ${process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? '?'}`, `Hôte : ${host}`, ...lines].join('\n')
  console.log(text)
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const r = await put('diag/base.txt', text, { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'text/plain; charset=utf-8' })
      console.log('Rapport publié :', r.url)
    } catch (e) {
      console.log('Rapport non publié :', e.message)
    }
  }
}
const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 15000 })
try {
  await client.connect()
  const size = await client.query('select pg_size_pretty(pg_database_size(current_database())) as taille')
  await report(['État : base joignable', `Taille : ${size.rows[0].taille}`])
  await client.end()
} catch (e) {
  await report(['État : base INJOIGNABLE', `Code : ${e.code ?? '-'}`, `Message : ${String(e.message).replace(/postgres(ql)?:\/\/\S+/g, '[adresse masquée]')}`])
  process.exit(1)
}
