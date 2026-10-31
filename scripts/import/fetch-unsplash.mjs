// Photos Unsplash (licence Unsplash : usage commercial gratuit) — candidats à choisir à la main.
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
const OUT = 'data/images-unsplash'
const C = {
  // Étape 2 — À domicile, sans visage.
  domicile: ['1562259929-b4e1fd3aef09', '1768839725085-829e6ac7ac26', '1789656435285-02cd411e5ffd', '1646640246129-dc3b66f383a2', '1625559424722-7b7d1199ad6e', '1627905646269-7f034dcc5738', '1758273238415-01ec03d9ef27', '1426927308491-6380b6a9936f', '1501087063833-3773ee886f20'],
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
