// Photos Unsplash (licence Unsplash : usage commercial gratuit) — candidats à choisir à la main.
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
const OUT = 'data/images-unsplash'
const C = {
  // Étape 2 bis — À domicile en couleur (gants + perceuse).
  domicile2: ['1646898644803-42f361bc95e2', '1641371227964-5051504ec380', '1636029697866-214ee5315764', '1625562888409-14b30c2b17b5', '1644308392725-69b682ae63a4', '1785484267196-3f7325819b26'],
}
import { existsSync, readFileSync } from 'node:fs'
const manifest = existsSync(path.join(OUT, 'manifest.json')) ? JSON.parse(readFileSync(path.join(OUT, 'manifest.json'), 'utf8')) : {}
for (const [k, ids] of Object.entries(C)) {
  mkdirSync(path.join(OUT, k), { recursive: true })
  manifest[k] = []
  for (const [i, id] of ids.entries()) {
    const url = id.startsWith('pexels:') ? `https://images.pexels.com/photos/${id.slice(7)}/pexels-photo-${id.slice(7)}.jpeg?auto=compress&cs=tinysrgb&w=1600` : `https://images.unsplash.com/photo-${id}?w=1600&q=82&fm=jpg&fit=max`
    const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (DALIL; salam@mydalil.com)' } })
    if (!res.ok) { console.log('échec', k, id, res.status); continue }
    writeFileSync(path.join(OUT, k, `${i + 1}.jpg`), Buffer.from(await res.arrayBuffer()))
    manifest[k].push({ name: `${i + 1}.jpg`, id, source: id.startsWith('pexels:') ? `https://www.pexels.com/photo/${id.slice(7)}/` : `https://unsplash.com/photos/${id}`, license: id.startsWith('pexels:') ? 'Licence Pexels' : 'Licence Unsplash' })
  }
  console.log(k, manifest[k].length)
}
writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1))
