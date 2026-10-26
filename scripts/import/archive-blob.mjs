// Archive des jeux bruts d’import (OpenStreetMap, Wikidata) dans Vercel Blob : hors du code du site.
// Usage (GitHub Actions) : BLOB_READ_WRITE_TOKEN=… node archive-blob.mjs <source> <fichier…>
// Rangement : imports/<source>/<date>/<fichier> et imports/<source>/latest/<fichier>.
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { put } from '@vercel/blob'

const [source, ...files] = process.argv.slice(2)
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.log('BLOB_READ_WRITE_TOKEN absent : archive Blob ignorée.')
  process.exit(0)
}
const day = new Date().toISOString().slice(0, 10)
for (const file of files) {
  const body = readFileSync(file)
  for (const folder of [day, 'latest']) {
    const { url } = await put(`imports/${source}/${folder}/${basename(file)}`, body, { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' })
    console.log(`${file} → ${url}`)
  }
}
