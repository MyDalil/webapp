// Mosquées et salles de prière OpenStreetMap absentes de DALIL, y compris sans nom (« Mosquée · nom à compléter »).
// Entrée : osm-mosques.json (scripts/import/fetch-mosques.mjs, branche import-data). Sortie : data/osm-mosques-selected.json.
// Doublon : lieu de culte déjà connu (OSM, Overture, Wikidata, recherche) à moins de 60 m, ou nom proche à moins de 100 m.
// Usage : node scripts/import/select-mosques.mjs <osm-mosques.json>
import { readFileSync, writeFileSync } from 'node:fs'

const D = 'src/modules/annuaire/data'
const raw = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const communes = JSON.parse(readFileSync('src/platform/referentiel/communes.json', 'utf8')).filter((c) => c.lat != null)
const WILAYAS = [...readFileSync('src/platform/referentiel/catalog.ts', 'utf8').matchAll(/\{"code":(\d+),"name":"([^"]+)"/g)].map((m) => ({ code: +m[1], name: m[2] }))
const key = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’'`]/g, '').replace(/[^a-z0-9؀-ۿ]+/g, ' ').trim()
const km = (a, b) => {
  const r = Math.PI / 180
  const x = (b.lng - a.lng) * r * Math.cos(((a.lat + b.lat) / 2) * r)
  const y = (b.lat - a.lat) * r
  return Math.sqrt(x * x + y * y) * 6371
}
const cell = (p) => `${Math.floor(p.lat * 100)}:${Math.floor(p.lng * 100)}`
const grid = new Map()
const put = (p) => grid.set(cell(p), [...(grid.get(cell(p)) ?? []), p])
const around = (p) => {
  const a = Math.floor(p.lat * 100)
  const b = Math.floor(p.lng * 100)
  const out = []
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) out.push(...(grid.get(`${a + i}:${b + j}`) ?? []))
  return out
}
const WORSHIP = new Set(['Mosquées', 'Salles de prière', 'Écoles coraniques'])
const known = [
  ...JSON.parse(readFileSync(`${D}/osm-selected.json`, 'utf8')),
  ...JSON.parse(readFileSync(`${D}/overture-selected.json`, 'utf8')),
  ...JSON.parse(readFileSync(`${D}/research-places.json`, 'utf8')),
  ...JSON.parse(readFileSync(`${D}/open-places-selected.json`, 'utf8')).map((r) => ({ ...r, lat: r.coord?.lat, lng: r.coord?.lng })),
]
const ids = new Set(known.map((r) => String(r.id).replace(/^osm:/, '')))
for (const r of known) if (r.lat != null && WORSHIP.has(r.category)) put({ name: r.name, lat: r.lat, lng: r.lng })
const words = (s) => new Set(key(s).split(' ').filter((w) => w.length > 2 && !['mosquee', 'masjid', 'masdjid', 'mosque', 'مسجد', 'جامع'].includes(w)))
const similar = (a, b) => {
  const x = words(a)
  const y = words(b)
  if (!x.size || !y.size) return false
  let n = 0
  for (const w of x) if (y.has(w)) n++
  return n / Math.min(x.size, y.size) >= 0.5
}
const nearest = (p) => communes.reduce((m, c) => (km(p, c) < km(p, m) ? c : m))
const out = []
let unnamed = 0
for (const m of raw) {
  if (ids.has(m.id)) continue
  const t = m.tags
  const name = (t['name:fr'] || t.name || t['name:ar'] || '').trim()
  const p = { lat: m.lat, lng: m.lng }
  const twin = around(p).find((e) => km(p, e) < 0.06 || (name && km(p, e) < 0.1 && similar(e.name, name)))
  if (twin) continue
  const c = nearest(p)
  const w = WILAYAS.find((x) => x.code === c.wilaya)
  if (!w) continue
  const musalla = t.place_of_worship === 'musalla' || /مصلى|musalla|salle de pri[eè]re/i.test(name)
  const category = musalla ? 'Salles de prière' : 'Mosquées'
  if (!name) unnamed++
  const label = musalla ? 'Salle de prière' : 'Mosquée'
  out.push({
    id: `osm:${m.id}`,
    provider: 'osm',
    name: name || `${label} · nom à compléter`,
    nameAr: t['name:ar'] && t['name:ar'] !== name ? t['name:ar'] : undefined,
    sector: 'mosquees-priere',
    category,
    wilaya: w.name,
    city: c.name,
    address: [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ') || undefined,
    lat: +m.lat.toFixed(6),
    lng: +m.lng.toFixed(6),
    website: t.website,
    phone: t.phone,
    intro: `${label} à ${c.name}, dans la wilaya ${/^[AEIOUÉÈÂÎÏ]/i.test(w.name) ? 'd’' : 'de '}${w.name}.${name ? '' : ' Son nom n’est pas encore connu de DALIL.'}`,
    sourceUrl: `https://www.openstreetmap.org/${m.id}`,
    note: `OpenStreetMap ${m.id} — © les contributeurs OpenStreetMap (ODbL).`,
    publicBody: false,
  })
  put({ name, lat: m.lat, lng: m.lng })
}
writeFileSync(`${D}/osm-mosques-selected.json`, JSON.stringify(out))
console.log('brut', raw.length, '· retenues', out.length, '· sans nom', unnamed)
