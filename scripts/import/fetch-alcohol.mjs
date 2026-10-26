// Lieux d’Algérie où OpenStreetMap signale de l’alcool (bar, pub, boîte de nuit, caviste, boissons alcoolisées servies).
// Sert à les retirer de DALIL (décision de Rad, 2026-10-26). Lecture seule. Sortie : src/modules/annuaire/data/alcohol-osm.json.
import { writeFileSync, mkdirSync } from 'node:fs'

const UA = 'DALIL/1.0 (https://www.mydalil.com; salam@mydalil.com)'
const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter']
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const Q = `[out:json][timeout:600];area["ISO3166-1"="DZ"][admin_level=2]->.dz;(
nwr["amenity"~"^(bar|pub|nightclub|biergarten|stripclub)$"](area.dz);
nwr["shop"~"^(alcohol|wine|beer|brewing_supplies)$"](area.dz);
nwr["craft"~"^(brewery|winery|distillery)$"](area.dz);
nwr["bar"~"^(yes|outdoor)$"](area.dz);
nwr["drink:beer"~"^(yes|served|only)$"](area.dz);
nwr["drink:wine"~"^(yes|served|only)$"](area.dz);
nwr["drink:spirits"~"^(yes|served|only)$"](area.dz);
nwr["drink:alcohol"~"^(yes|served|only)$"](area.dz);
nwr["alcohol"~"^(yes|only)$"](area.dz);
nwr["cuisine"~"(beer|wine|cocktail|tapas)"](area.dz);
);out tags;`
let els = null
for (let i = 0; i < 9 && !els; i++) {
  try {
    const r = await fetch(ENDPOINTS[i % ENDPOINTS.length], { method: 'POST', headers: { 'user-agent': UA, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ data: Q }) })
    if (r.ok) els = (await r.json()).elements
    else console.log(r.status, (await r.text()).slice(0, 160))
  } catch (e) {
    console.log(e.message)
  }
  if (!els) await sleep(30000 * (i + 1))
}
if (!els) throw new Error('Overpass indisponible')
const KEYS = /^(name|name:fr|name:ar|amenity|shop|craft|tourism|bar|drink:.*|alcohol|cuisine)$/
const out = els.map((e) => ({ id: `${e.type}/${e.id}`, tags: Object.fromEntries(Object.entries(e.tags ?? {}).filter(([k]) => KEYS.test(k))) }))
mkdirSync('src/modules/annuaire/data', { recursive: true })
writeFileSync('src/modules/annuaire/data/alcohol-osm.json', JSON.stringify(out, null, 0))
console.log('lieux avec alcool signalé', out.length)
