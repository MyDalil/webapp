// Contrôle visuel : 16 photos tirées au hasard parmi les lieux (hors communes), en vignettes 480 px.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
const { photos } = JSON.parse(readFileSync('src/modules/annuaire/data/place-photos.json', 'utf8'))
const names = new Map()
for (const f of ['osm-selected', 'osm-mosques-selected', 'overture-selected', 'research-places', 'open-places-selected', 'public-bodies'])
  try { for (const r of JSON.parse(readFileSync(`src/modules/annuaire/data/${f}.json`, 'utf8'))) names.set(r.id, `${r.name} — ${r.category}, ${r.city ?? ''}`) } catch {}
const pool = Object.entries(photos).filter(([id]) => names.has(id) && !/^Q/.test(id) || /Q/.test(id) && names.get(id) && !/Administrations/.test(names.get(id)))
const pick = pool.sort(() => Math.random() - 0.5).slice(0, 16)
mkdirSync('data/photo-sample', { recursive: true })
const index = []
for (const [n, [id, list]] of pick.entries()) {
  const url = list[0].url.replace(/\/\d+px-/, '/500px-')
  const res = await fetch(url, { headers: { 'user-agent': 'DALIL/1.0 (salam@mydalil.com)' } }).catch(() => null)
  if (!res?.ok) { console.log('échec', res?.status, url); continue }
  writeFileSync(`data/photo-sample/${String(n + 1).padStart(2, '0')}.jpg`, Buffer.from(await res.arrayBuffer()))
  index.push({ n: n + 1, id, place: names.get(id), via: list[0].via, page: list[0].page })
}
writeFileSync('data/photo-sample/index.json', JSON.stringify(index, null, 1))
