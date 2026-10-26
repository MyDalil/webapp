// Toutes les mosquées et salles de prière d’Algérie dans OpenStreetMap (ODbL), y compris sans nom ou seulement
// dessinées comme bâtiment (`building=mosque`). Complète osm-places.json, qui ne gardait que les lieux nommés.
// Sortie : src/modules/annuaire/data/osm-mosques.json (brut). Sélection : scripts/import/select-mosques.mjs.
import { writeFileSync, mkdirSync } from 'node:fs'

const UA = 'DALIL/1.0 (https://www.mydalil.com; salam@mydalil.com)'
const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter']
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const Q = `[out:json][timeout:900][maxsize:1073741824];area["ISO3166-1"="DZ"][admin_level=2]->.dz;(
nwr["amenity"="place_of_worship"]["religion"="muslim"](area.dz);
nwr["building"="mosque"](area.dz);
nwr["amenity"="place_of_worship"][!"religion"]["name"~"mosqu|masjid|masdjid|mesjid|djamaa|jamaa|jami|مسجد|جامع|مصلى",i](area.dz);
);out center tags;`
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
const KEYS = /^(name|name:fr|name:ar|name:en|amenity|building|religion|denomination|place_of_worship|addr:.*|wheelchair|female|opening_hours|website|phone|start_date|wikidata|heritage)$/
const out = els
  .map((e) => ({ id: `${e.type}/${e.id}`, lat: e.lat ?? e.center?.lat, lng: e.lon ?? e.center?.lon, tags: Object.fromEntries(Object.entries(e.tags ?? {}).filter(([k]) => KEYS.test(k))) }))
  .filter((x) => x.lat != null)
mkdirSync('src/modules/annuaire/data', { recursive: true })
writeFileSync('src/modules/annuaire/data/osm-mosques.json', JSON.stringify(out))
console.log('mosquées et salles de prière', out.length, 'sans nom', out.filter((x) => !x.tags.name && !x.tags['name:ar'] && !x.tags['name:fr']).length)
