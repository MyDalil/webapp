// Récupère les lieux d’Algérie dans OpenStreetMap (ODbL, © les contributeurs OpenStreetMap) via l’API Overpass.
// Seulement des faits : nom, type, coordonnées, adresse, téléphone, site, email, horaires. Aucun avis, aucune photo.
// Chaque lieu est rattaché à sa wilaya par les limites administratives OSM (admin_level 4).
// Sortie : src/modules/annuaire/data/osm-places.json + osm-stats.json (versionnés, sélectionnés puis importés par migration).
// Lancé par .github/workflows/import-osm.yml (le conteneur de développement n’a pas accès à Overpass).
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs'

const UA = 'DALIL/1.0 (https://www.mydalil.com; salam@mydalil.com)'
const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']
const OUT = 'src/modules/annuaire/data'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const LOG = []
const log = (...a) => { const line = a.join(' '); LOG.push(`${new Date().toISOString()} ${line}`); console.log(line) }
const flush = (places, stats) => {
  mkdirSync(OUT, { recursive: true })
  writeFileSync(`${OUT}/osm-places.json`, JSON.stringify(places))
  writeFileSync(`${OUT}/osm-stats.json`, JSON.stringify({ fetchedAt: new Date().toISOString(), total: places.length, stats, log: LOG }, null, 1))
}

// Catégorie DALIL ← filtres OSM (nœuds, chemins et relations nommés).
const GROUPS = [
  ['sante-soins', 'Hôpitaux', ['["amenity"="hospital"]']],
  ['sante-soins', 'Cliniques', ['["amenity"="clinic"]', '["healthcare"="clinic"]']],
  ['sante-soins', 'Pharmacies', ['["amenity"="pharmacy"]']],
  ['sante-soins', 'Médecins', ['["amenity"="doctors"]', '["amenity"="dentist"]']],
  ['sante-soins', 'Laboratoires', ['["healthcare"="laboratory"]']],
  ['education-formation', 'Universités', ['["amenity"="university"]']],
  ['education-formation', 'Formation professionnelle', ['["amenity"="college"]']],
  ['education-formation', 'Écoles', ['["amenity"="school"]']],
  ['education-formation', 'Crèches', ['["amenity"="kindergarten"]', '["amenity"="childcare"]']],
  ['education-formation', 'Écoles de langues', ['["amenity"="language_school"]']],
  ['mosquees-priere', 'Mosquées', ['["amenity"="place_of_worship"]["religion"="muslim"]']],
  ['mosquees-priere', 'Écoles coraniques', ['["amenity"="school"]["religion"="muslim"]', '["school"="quranic"]']],
  ['administrations-services-publics', 'Services municipaux', ['["amenity"="townhall"]']],
  ['administrations-services-publics', 'Administrations', ['["office"="government"]', '["amenity"="post_office"]', '["amenity"="courthouse"]']],
  ['administrations-services-publics', 'Ambassades', ['["diplomatic"="embassy"]', '["amenity"="embassy"]']],
  ['administrations-services-publics', 'Consulats', ['["diplomatic"="consulate"]']],
  ['administrations-services-publics', 'Offices du tourisme', ['["tourism"="information"]["information"="office"]']],
  ['administrations-services-publics', 'Contacts utiles et urgences', ['["amenity"="police"]', '["amenity"="fire_station"]']],
  ['droit-finance-conseil', 'Banques', ['["amenity"="bank"]']],
  ['droit-finance-conseil', 'Notaires', ['["office"="notary"]']],
  ['droit-finance-conseil', 'Avocats', ['["office"="lawyer"]']],
  ['transports-mobilite', 'Gares et stations', ['["railway"="station"]', '["amenity"="bus_station"]', '["aeroway"="aerodrome"]["iata"]']],
  ['transports-mobilite', 'Location de véhicules', ['["amenity"="car_rental"]']],
  ['transports-mobilite', 'Services automobiles', ['["shop"="car_repair"]', '["amenity"="fuel"]']],
  ['hebergement-sejours', 'Hôtels', ['["tourism"="hotel"]']],
  ['hebergement-sejours', 'Maisons d’hôtes', ['["tourism"="guest_house"]']],
  ['hebergement-sejours', 'Agences de voyages', ['["shop"="travel_agency"]', '["office"="travel_agent"]']],
  ['restaurants-gastronomie', 'Restaurants', ['["amenity"="restaurant"]']],
  ['restaurants-gastronomie', 'Cafés', ['["amenity"="cafe"]']],
  ['restaurants-gastronomie', 'Pâtisseries', ['["shop"="pastry"]', '["shop"="confectionery"]']],
  ['restaurants-gastronomie', 'Glaciers', ['["amenity"="ice_cream"]']],
  ['bien-etre-sport', 'Hammams', ['["amenity"="public_bath"]', '["leisure"="sauna"]']],
  ['bien-etre-sport', 'Salles de sport', ['["leisure"="fitness_centre"]']],
  ['bien-etre-sport', 'Installations sportives', ['["leisure"="sports_centre"]', '["leisure"="stadium"]', '["leisure"="swimming_pool"]["access"!="private"]']],
  ['commerces-achats', 'Alimentation', ['["shop"="supermarket"]', '["shop"="bakery"]']],
  ['commerces-achats', 'Librairies', ['["shop"="books"]']],
  ['commerces-achats', 'Habillement', ['["shop"="clothes"]']],
  ['logement-immobilier', 'Agences immobilières', ['["office"="estate_agent"]']],
  ['restaurants-gastronomie', 'Salons de thé', ['["amenity"="cafe"]["cuisine"~"tea"]', '["shop"="tea"]']],
  ['restaurants-gastronomie', 'Traiteurs', ['["craft"="caterer"]', '["shop"="caterer"]']],
  ['bien-etre-sport', 'Spas', ['["leisure"="spa"]', '["amenity"="spa"]', '["shop"="massage"]']],
  ['bien-etre-sport', 'Soins esthétiques', ['["shop"="beauty"]', '["shop"="hairdresser"]']],
  ['bien-etre-sport', 'Clubs sportifs', ['["club"="sport"]', '["sport"]["leisure"="sports_club"]']],
  ['mosquees-priere', 'Salles de prière', ['["amenity"="place_of_worship"]["religion"="muslim"]["building"!="mosque"]["place_of_worship"="musalla"]', '["amenity"="prayer_room"]']],
  ['mosquees-priere', 'Associations caritatives et entraide', ['["office"="charity"]', '["office"="ngo"]', '["social_facility"]']],
  ['mosquees-priere', 'Pompes funèbres musulmanes et toilette mortuaire', ['["shop"="funeral_directors"]', '["amenity"="funeral_hall"]']],
  ['commerces-achats', 'Équipement de la maison', ['["shop"="furniture"]', '["shop"="hardware"]', '["shop"="appliance"]', '["shop"="houseware"]', '["shop"="doityourself"]']],
  ['transports-mobilite', 'Transporteurs', ['["office"="logistics"]', '["office"="courier"]', '["amenity"="courier"]']],
  ['transports-mobilite', 'Déménagement', ['["office"="moving_company"]']],
  ['maison-travaux', 'Architectes', ['["office"="architect"]']],
  ['maison-travaux', 'Artisans', ['["craft"]["craft"!="caterer"]']],
  ['maison-travaux', 'Construction', ['["office"="construction_company"]', '["craft"="builder"]', '["shop"="trade"]']],
  ['droit-finance-conseil', 'Comptables', ['["office"="accountant"]', '["office"="tax_advisor"]']],
  ['droit-finance-conseil', 'Conseil aux entreprises', ['["office"="consulting"]', '["office"="company"]["company"="consulting"]']],
]

async function overpass(q, tries = 8) {
  for (let i = 0; i < tries; i++) {
    const url = ENDPOINTS[i % ENDPOINTS.length]
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'user-agent': UA, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ data: q }) })
      if (res.ok) return (await res.json()).elements
      log('Overpass', url, res.status, (await res.text()).slice(0, 200).replace(/\s+/g, ' '), 'essai', i + 1)
    } catch (e) {
      log('Overpass', url, e.message, 'essai', i + 1)
    }
    await sleep(Math.min(30000 * (i + 1), 180000))
  }
  throw new Error('Overpass indisponible')
}

// Limites des wilayas (admin_level 4) : polygones extérieurs.
let rels = []
try {
  rels = await overpass(`[out:json][timeout:300];area["ISO3166-1"="DZ"][admin_level=2]->.dz;rel(area.dz)["boundary"="administrative"]["admin_level"="4"];out geom;`)
} catch (e) {
  log('limites des wilayas indisponibles :', e.message)
}
const wilayas = rels.map((r) => {
  const rings = []
  let cur = []
  for (const m of r.members.filter((m) => m.role === 'outer' && m.geometry)) {
    const pts = m.geometry.map((g) => [g.lon, g.lat])
    if (!cur.length) cur = pts
    else if (cur.at(-1)[0] === pts[0][0] && cur.at(-1)[1] === pts[0][1]) cur = cur.concat(pts.slice(1))
    else if (cur.at(-1)[0] === pts.at(-1)[0] && cur.at(-1)[1] === pts.at(-1)[1]) cur = cur.concat(pts.reverse().slice(1))
    else { rings.push(cur); cur = pts }
    if (cur.length > 3 && cur[0][0] === cur.at(-1)[0] && cur[0][1] === cur.at(-1)[1]) { rings.push(cur); cur = [] }
  }
  if (cur.length) rings.push(cur)
  return { name: r.tags['name:fr'] || r.tags.name, ref: r.tags.ref || r.tags['ISO3166-2'], rings }
})
log('wilayas', wilayas.length)
const inside = (x, y, ring) => {
  let c = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c
  }
  return c
}
const wilayaOf = (lat, lng) => wilayas.find((w) => w.rings.some((r) => inside(lng, lat, r)))

const previous = existsSync(`${OUT}/osm-places.json`) ? JSON.parse(readFileSync(`${OUT}/osm-places.json`, 'utf8')) : []
const prevStats = existsSync(`${OUT}/osm-stats.json`) ? JSON.parse(readFileSync(`${OUT}/osm-stats.json`, 'utf8')).stats ?? {} : {}
const places = [...previous]
const stats = { ...prevStats }
for (const [sector, category, filters] of GROUPS) {
  if (stats[`${sector} › ${category}`] > 0) continue // déjà récupéré
  const body = filters.map((f) => `nwr${f}["name"](area.dz);`).join('')
  let els = []
  try {
    els = await overpass(`[out:json][timeout:300][maxsize:1073741824];area["ISO3166-1"="DZ"][admin_level=2]->.dz;(${body});out center tags;`)
  } catch (e) {
    log('échec', sector, category, e.message)
  }
  let n = 0
  for (const e of els) {
    const t = e.tags || {}
    const lat = e.lat ?? e.center?.lat
    const lng = e.lon ?? e.center?.lon
    if (lat == null) continue
    const w = wilayaOf(lat, lng)
    places.push({
      id: `${e.type}/${e.id}`,
      sector,
      category,
      name: t['name:fr'] || t.name,
      nameAr: t['name:ar'] || (/[؀-ۿ]/.test(t.name || '') ? t.name : null),
      lat: +lat.toFixed(6),
      lng: +lng.toFixed(6),
      wilaya: w?.name ?? null,
      wilayaRef: w?.ref ?? null,
      city: t['addr:city'] || null,
      street: [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ') || null,
      phone: t.phone || t['contact:phone'] || null,
      email: t.email || t['contact:email'] || null,
      website: t.website || t['contact:website'] || null,
      hours: t.opening_hours || null,
      wheelchair: t.wheelchair || null,
      operator: t.operator || null,
      wikidata: t.wikidata || null,
    })
    n++
  }
  stats[`${sector} › ${category}`] = n
  log(sector, category, n)
  flush(places, stats)
  await sleep(4000)
}
flush(places, stats)
log('total', places.length)
