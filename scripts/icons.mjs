// Icônes de l’application installable (PWA), générées depuis public/favicon.svg : `node scripts/icons.mjs`.
// - icon-192/512 : le favicon tel quel (coins arrondis) ;
// - maskable-192/512 et apple-touch-icon : fond plein (le rectangle du favicon sans arrondi), le dessin tient dans la zone sûre.
import { readFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const svg = await readFile(path.join(root, 'public/favicon.svg'), 'utf8')
const fullBleed = svg.replace(/\s+rx="[^"]*"/, '')
if (fullBleed === svg) throw new Error('favicon.svg : rectangle arrondi introuvable')

const out = path.join(root, 'public/icons')
await mkdir(out, { recursive: true })

const render = (source, size, file) =>
  sharp(Buffer.from(source), { density: Math.ceil((72 * size) / 64) })
    .resize(size, size)
    .png({ compressionLevel: 9, palette: true })
    .toFile(path.join(out, file))

await Promise.all([
  render(svg, 192, 'icon-192.png'),
  render(svg, 512, 'icon-512.png'),
  render(fullBleed, 192, 'maskable-192.png'),
  render(fullBleed, 512, 'maskable-512.png'),
  render(fullBleed, 180, 'apple-touch-icon.png'),
])
console.log('Icônes écrites dans public/icons')
