// Photos Unsplash (licence Unsplash : usage commercial gratuit) — candidats à choisir à la main.
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
const OUT = 'data/images-unsplash'
const C = {
  // Annonces · Véhicules : voitures dans une rue d’Algérie ou du littoral.
  vehicules: ['1714948817459-319d9bef9dce', '1588142842388-9844c5814bbc', '1588547383990-15e1db7f21ae', '1789498883061-667d68fc365d', '1792021626468-33917485dbfa', '1759151165729-738e12b176be', '1780914436167-592f17d46d1e', '1764877272645-760d80700096', '1785710097626-7780086a12b2'],
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
