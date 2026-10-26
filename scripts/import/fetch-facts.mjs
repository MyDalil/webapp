// Faits complémentaires des lieux (OpenStreetMap ODbL + Wikidata CC0) : accès, services, cuisine, capacité, patrimoine…
// Seulement des faits vérifiables, jamais d’avis. Sortie : src/modules/annuaire/data/osm-facts.json + wikidata-facts.json.
// Lancé par .github/workflows/import-facts.yml (le conteneur de développement n’a pas accès à Overpass ni à Wikidata).
// Usage : node scripts/import/fetch-facts.mjs <open-places-selected.json>
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'

const UA = 'DALIL/1.0 (https://www.mydalil.com; salam@mydalil.com)'
const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']
const OUT = 'src/modules/annuaire/data'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
mkdirSync(OUT, { recursive: true })

// Étiquettes OSM gardées (faits pratiques).
const KEEP = /^(wheelchair|toilets(:wheelchair)?|internet_access(:fee)?|cuisine|diet:halal|outdoor_seating|takeaway|delivery|stars|rooms|beds|emergency|healthcare(:speciality)?|denomination|capacity|start_date|heritage|operator(:type)?|payment:(cards|credit_cards|debit_cards|cib|edahabia)|air_conditioning|smoking|fee|atm|drive_through|isced:level|description(:fr)?|wikipedia|wikidata|opening_hours|female|reservation|dispensing|image|wikimedia_commons|building:levels|levels|school|religion|parking|check_in|check_out|brand|phone|contact:phone|website|contact:website|email|contact:email|contact:facebook|contact:instagram)$/

// Mêmes filtres que fetch-osm.mjs (une requête par famille, étiquettes seules).
const FILTERS = [
  '["amenity"~"^(hospital|clinic|pharmacy|doctors|dentist|university|college|school|kindergarten|childcare|language_school|townhall|post_office|courthouse|embassy|police|fire_station|bank|bus_station|car_rental|fuel|restaurant|cafe|ice_cream|public_bath|place_of_worship|prayer_room|funeral_hall|courier)$"]',
  '["healthcare"~"^(clinic|laboratory)$"]',
  '["office"~"^(government|notary|lawyer|travel_agent|estate_agent|charity|ngo|logistics|courier|moving_company|architect|construction_company|accountant|tax_advisor|consulting)$"]',
  '["diplomatic"~"^(embassy|consulate)$"]',
  '["tourism"~"^(hotel|guest_house|information)$"]',
  '["railway"="station"]',
  '["aeroway"="aerodrome"]["iata"]',
  '["shop"~"^(car_repair|travel_agency|pastry|confectionery|supermarket|bakery|books|clothes|tea|caterer|massage|beauty|hairdresser|funeral_directors|furniture|hardware|appliance|houseware|doityourself|trade)$"]',
  '["leisure"~"^(sauna|fitness_centre|sports_centre|stadium|swimming_pool|spa|sports_club)$"]',
  '["craft"]',
  '["social_facility"]',
]

async function post(url, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'user-agent': UA, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body) })
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 160)}`)
  return res.json()
}
async function overpass(q) {
  for (let i = 0; i < 8; i++) {
    try {
      return (await post(ENDPOINTS[i % ENDPOINTS.length], { data: q })).elements
    } catch (e) {
      console.log('Overpass', ENDPOINTS[i % ENDPOINTS.length], e.message, 'essai', i + 1)
      await sleep(Math.min(30000 * (i + 1), 180000))
    }
  }
  throw new Error('Overpass indisponible')
}

const osmFile = `${OUT}/osm-facts.json`
const osm = existsSync(osmFile) ? JSON.parse(readFileSync(osmFile, 'utf8')) : {}
const qids = new Set()
for (const f of FILTERS) {
  if (osm[`_done:${f}`]) continue
  try {
    const els = await overpass(`[out:json][timeout:600][maxsize:1073741824];area["ISO3166-1"="DZ"][admin_level=2]->.dz;nwr${f}["name"](area.dz);out tags;`)
    let n = 0
    for (const e of els) {
      const t = {}
      for (const [k, v] of Object.entries(e.tags || {})) if (KEEP.test(k)) t[k] = v
      if (Object.keys(t).length) (osm[`${e.type}/${e.id}`] = t), n++
    }
    osm[`_done:${f}`] = n
    console.log(f, els.length, n)
  } catch (e) {
    console.log('échec', f, e.message)
  }
  writeFileSync(osmFile, JSON.stringify(osm))
  await sleep(5000)
}
for (const t of Object.values(osm)) if (typeof t === 'object' && /^Q\d+$/.test(t.wikidata ?? '')) qids.add(t.wikidata)

// Wikidata : lieux ouverts + lieux OSM liés à Wikidata.
const open = process.argv[2] && existsSync(process.argv[2]) ? JSON.parse(readFileSync(process.argv[2], 'utf8')) : []
for (const p of open) if (/^Q\d+$/.test(p.id)) qids.add(p.id)
const PROPS = { P1435: 'heritage', P571: 'inception', P149: 'style', P84: 'architect', P1083: 'capacity', P2044: 'elevation', P856: 'website', P18: 'image', P140: 'religion', P127: 'owner', P137: 'operator', P1329: 'phone', P968: 'email', P2002: 'twitter', P2013: 'facebook', P2003: 'instagram', P1619: 'opening', P5816: 'state', P2046: 'area', P1101: 'floors', P3134: 'tripadvisor' }
const api = async (params) => {
  for (let i = 0; i < 5; i++) {
    try {
      const r = await fetch(`https://www.wikidata.org/w/api.php?${new URLSearchParams({ format: 'json', ...params })}`, { headers: { 'user-agent': UA } })
      if (r.ok) return r.json()
    } catch {}
    await sleep(5000 * (i + 1))
  }
  return { entities: {} }
}
const val = (s) => {
  const d = s.mainsnak?.datavalue
  if (!d) return null
  if (d.type === 'wikibase-entityid') return { item: d.value.id }
  if (d.type === 'time') return d.value.time.replace(/^\+/, '').slice(0, d.value.precision >= 11 ? 10 : d.value.precision === 10 ? 7 : 4)
  if (d.type === 'quantity') return { amount: +d.value.amount, unit: d.value.unit?.split('/').pop() }
  if (d.type === 'monolingualtext') return d.value.text
  return d.value
}
const wd = {}
const refs = new Set()
const ids = [...qids]
for (let i = 0; i < ids.length; i += 50) {
  const { entities = {} } = await api({ action: 'wbgetentities', ids: ids.slice(i, i + 50).join('|'), props: 'claims|descriptions', languages: 'fr' })
  for (const [id, e] of Object.entries(entities)) {
    const out = { description: e.descriptions?.fr?.value ?? null }
    for (const [p, key] of Object.entries(PROPS)) {
      const vals = (e.claims?.[p] ?? []).filter((s) => s.rank !== 'deprecated').map(val).filter((v) => v != null)
      if (!vals.length) continue
      out[key] = vals
      for (const v of vals) if (v?.item) refs.add(v.item)
    }
    wd[id] = out
  }
  await sleep(500)
}
const labels = {}
const rl = [...refs]
for (let i = 0; i < rl.length; i += 50) {
  const { entities = {} } = await api({ action: 'wbgetentities', ids: rl.slice(i, i + 50).join('|'), props: 'labels', languages: 'fr|en' })
  for (const [id, e] of Object.entries(entities)) labels[id] = e.labels?.fr?.value ?? e.labels?.en?.value ?? null
  await sleep(500)
}
writeFileSync(`${OUT}/wikidata-facts.json`, JSON.stringify({ fetchedAt: new Date().toISOString(), items: wd, labels }))
console.log('osm', Object.keys(osm).length, 'wikidata', Object.keys(wd).length, 'libellés', Object.keys(labels).length)
