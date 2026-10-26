// Sélectionne les lieux Overture Maps (CDLA Permissive 2.0) publiables dans DALIL et les infos manquantes des fiches existantes.
// Entrée : overture-dz.jsonl.gz (fetch-overture.py) + lots existants (osm-selected, open-places-selected, research-places).
// Sorties : overture-selected.json (nouvelles fiches) et overture-complete.json (identifiant source existant → champs à compléter).
// Règles : catégorie DALIL seulement si la taxonomie Overture la donne (jamais devinée) ; confiance ≥ 0,6 (lieux de culte ≥ 0,5) ;
// doublon = même lieu à moins de 80 m (nom proche ou même catégorie) ; jamais d’alcool, de musique ni de culte non musulman.
import { readFileSync, writeFileSync, createReadStream } from 'node:fs'
import { createGunzip } from 'node:zlib'
import { createInterface } from 'node:readline'

const D = 'src/modules/annuaire/data'
const [osmPath, openPath, researchPath] = process.argv.slice(2)
const communes = JSON.parse(readFileSync('src/platform/referentiel/communes.json', 'utf8')).filter((c) => c.lat != null)
const WILAYAS = [...readFileSync('src/platform/referentiel/catalog.ts', 'utf8').matchAll(/\{"code":(\d+),"name":"([^"]+)"/g)].map((m) => ({ code: +m[1], name: m[2] }))
const key = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’'`]/g, '').replace(/[^a-z0-9؀-ۿ]+/g, ' ').trim()
const km = (a, b) => {
  const r = Math.PI / 180
  const x = (b.lng - a.lng) * r * Math.cos(((a.lat + b.lat) / 2) * r)
  const y = (b.lat - a.lat) * r
  return Math.sqrt(x * x + y * y) * 6371
}
// Grille ~1 km pour les recherches de voisins.
const cell = (p) => `${Math.floor(p.lat * 100)}:${Math.floor(p.lng * 100)}`
const around = (grid, p) => {
  const a = Math.floor(p.lat * 100)
  const b = Math.floor(p.lng * 100)
  const out = []
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) out.push(...(grid.get(`${a + i}:${b + j}`) ?? []))
  return out
}
const cgrid = new Map()
for (const c of communes) {
  const k = `${Math.floor(c.lat * 10)}:${Math.floor(c.lng * 10)}`
  cgrid.set(k, [...(cgrid.get(k) ?? []), c])
}
const nearestCommune = (p) => {
  let best = null
  let d = Infinity
  for (let r = 1; r <= 6 && !best; r++) {
    const a = Math.floor(p.lat * 10)
    const b = Math.floor(p.lng * 10)
    for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) for (const c of cgrid.get(`${a + i}:${b + j}`) ?? []) {
      const k = km(p, c)
      if (k < d) { d = k; best = c }
    }
  }
  return best ?? communes.reduce((m, c) => (km(p, c) < km(p, m) ? c : m))
}

// Taxonomie Overture → catégorie DALIL. Première correspondance dans : primaire, puis hiérarchie (du plus précis au plus large).
const MAP = {
  muslim_place_of_worship: ['mosquees-priere', 'Mosquées'], mosque: ['mosquees-priere', 'Mosquées'],
  restaurant: ['restaurants-gastronomie', 'Restaurants'], casual_eatery: ['restaurants-gastronomie', 'Restaurants'], fast_food_restaurant: ['restaurants-gastronomie', 'Restaurants'], food_truck_stand: ['restaurants-gastronomie', 'Restaurants'],
  cafe: ['restaurants-gastronomie', 'Cafés'], coffee_shop: ['restaurants-gastronomie', 'Cafés'], non_alcoholic_beverage_venue: ['restaurants-gastronomie', 'Cafés'], smoothie_juice_bar: ['restaurants-gastronomie', 'Cafés'],
  tea_room: ['restaurants-gastronomie', 'Salons de thé'], bakery: ['restaurants-gastronomie', 'Pâtisseries'], patisserie_cake_shop: ['restaurants-gastronomie', 'Pâtisseries'], pastry_shop: ['restaurants-gastronomie', 'Pâtisseries'], dessert_shop: ['restaurants-gastronomie', 'Pâtisseries'],
  ice_cream_shop: ['restaurants-gastronomie', 'Glaciers'], caterer: ['restaurants-gastronomie', 'Traiteurs'],
  preschool: ['education-formation', 'Crèches'], child_care_and_day_care: ['education-formation', 'Crèches'], elementary_school: ['education-formation', 'Écoles'], middle_school: ['education-formation', 'Écoles'], high_school: ['education-formation', 'Écoles'], school: ['education-formation', 'Écoles'],
  college_university: ['education-formation', 'Universités'], language_school: ['education-formation', 'Écoles de langues'], specialty_school: ['education-formation', 'Formation professionnelle'], vocational_and_technical_school: ['education-formation', 'Formation professionnelle'], tutoring_service: ['education-formation', 'Formation professionnelle'],
  hospital: ['sante-soins', 'Hôpitaux'], emergency_department: ['sante-soins', 'Hôpitaux'], emergency_or_urgent_care_facility: ['sante-soins', 'Hôpitaux'],
  outpatient_care_facility: ['sante-soins', 'Cliniques'], primary_care_or_general_clinic: ['sante-soins', 'Cliniques'], surgery: ['sante-soins', 'Cliniques'], specialized_medical_facility: ['sante-soins', 'Cliniques'],
  dental_clinic: ['sante-soins', 'Médecins'], dentist: ['sante-soins', 'Médecins'], doctor: ['sante-soins', 'Médecins'], pediatric_clinic: ['sante-soins', 'Médecins'], vision_or_eye_care_clinic: ['sante-soins', 'Médecins'], specialized_health_care: ['sante-soins', 'Médecins'],
  reproductive_perinatal_and_womens_care: ['sante-soins', 'Médecins'], behavioral_or_mental_health_clinic: ['sante-soins', 'Médecins'], physical_medicine_and_rehabilitation: ['sante-soins', 'Médecins'], medical_service: ['sante-soins', 'Médecins'],
  diagnostics_imaging_or_lab_service: ['sante-soins', 'Laboratoires'], pharmacy_and_drug_store: ['sante-soins', 'Pharmacies'], pharmacy: ['sante-soins', 'Pharmacies'],
  hammam: ['bien-etre-sport', 'Hammams'], spa: ['bien-etre-sport', 'Spas'], wellness_service: ['bien-etre-sport', 'Spas'], personal_or_beauty_service: ['bien-etre-sport', 'Soins esthétiques'], beauty_salon: ['bien-etre-sport', 'Soins esthétiques'], hair_salon: ['bien-etre-sport', 'Soins esthétiques'], barber: ['bien-etre-sport', 'Soins esthétiques'],
  gym: ['bien-etre-sport', 'Salles de sport'], fitness_studio: ['bien-etre-sport', 'Salles de sport'], sport_or_recreation_club: ['bien-etre-sport', 'Clubs sportifs'], sport_league: ['bien-etre-sport', 'Clubs sportifs'], sport_team: ['bien-etre-sport', 'Clubs sportifs'],
  sport_or_fitness_facility: ['bien-etre-sport', 'Installations sportives'], stadium_arena: ['bien-etre-sport', 'Installations sportives'], sport_field: ['bien-etre-sport', 'Installations sportives'], sport_court: ['bien-etre-sport', 'Installations sportives'], swimming_pool: ['bien-etre-sport', 'Installations sportives'],
  real_estate_service: ['logement-immobilier', 'Agences immobilières'], real_estate_agent: ['logement-immobilier', 'Agences immobilières'],
  hotel: ['hebergement-sejours', 'Hôtels'], resort: ['hebergement-sejours', 'Hôtels'], inn: ['hebergement-sejours', 'Hôtels'], lodging: ['hebergement-sejours', 'Hôtels'], private_lodging: ['hebergement-sejours', 'Maisons d’hôtes'], bed_and_breakfast: ['hebergement-sejours', 'Maisons d’hôtes'], travel_service: ['hebergement-sejours', 'Agences de voyages'], travel_agency: ['hebergement-sejours', 'Agences de voyages'],
  museum: ['culture-nature-loisirs', 'Musées'], historic_site: ['culture-nature-loisirs', 'Monuments et sites historiques'], monument: ['culture-nature-loisirs', 'Monuments et sites historiques'], castle: ['culture-nature-loisirs', 'Monuments et sites historiques'], fort: ['culture-nature-loisirs', 'Monuments et sites historiques'],
  national_park: ['culture-nature-loisirs', 'Parcs naturels et réserves'], nature_reserve: ['culture-nature-loisirs', 'Parcs naturels et réserves'], forest: ['culture-nature-loisirs', 'Parcs naturels et réserves'], waterfall: ['culture-nature-loisirs', 'Cascades, gorges et grottes'], hot_springs: ['culture-nature-loisirs', 'Cascades, gorges et grottes'],
  lake: ['culture-nature-loisirs', 'Lacs et oasis'], library: ['culture-nature-loisirs', 'Bibliothèques'], park: ['culture-nature-loisirs', 'Parcs'], public_plaza: ['culture-nature-loisirs', 'Parcs'], playground: ['culture-nature-loisirs', 'Parcs'], beach: ['culture-nature-loisirs', 'Plages'], garden: ['culture-nature-loisirs', 'Jardins'],
  zoo: ['culture-nature-loisirs', 'Activités familiales'], amusement_park: ['culture-nature-loisirs', 'Activités familiales'], aquarium: ['culture-nature-loisirs', 'Activités familiales'], animal_attraction: ['culture-nature-loisirs', 'Activités familiales'], amusement_attraction: ['culture-nature-loisirs', 'Activités familiales'], science_attraction: ['culture-nature-loisirs', 'Activités familiales'], planetarium: ['culture-nature-loisirs', 'Activités familiales'],
  books_music_and_video_store: ['commerces-achats', 'Librairies'], bookstore: ['commerces-achats', 'Librairies'], food_and_beverage_store: ['commerces-achats', 'Alimentation'], convenience_store: ['commerces-achats', 'Alimentation'], grocery_store: ['commerces-achats', 'Alimentation'], supermarket: ['commerces-achats', 'Alimentation'], superstore: ['commerces-achats', 'Alimentation'], warehouse_club_store: ['commerces-achats', 'Alimentation'], farmers_market: ['commerces-achats', 'Alimentation'],
  fashion_and_apparel_store: ['commerces-achats', 'Habillement'], clothing_store: ['commerces-achats', 'Habillement'], hardware_home_and_garden_store: ['commerces-achats', 'Équipement de la maison'], furniture_store: ['commerces-achats', 'Équipement de la maison'], electronics_store: ['commerces-achats', 'Équipement de la maison'], appliance_store: ['commerces-achats', 'Équipement de la maison'],
  shipping_or_delivery_service: ['transports-mobilite', 'Transporteurs'], b2b_transportation_and_storage_service: ['transports-mobilite', 'Transporteurs'], moving_company: ['transports-mobilite', 'Déménagement'], car_rental: ['transports-mobilite', 'Location de véhicules'],
  automotive_service: ['transports-mobilite', 'Services automobiles'], auto_dealer: ['transports-mobilite', 'Services automobiles'], vehicle_dealer: ['transports-mobilite', 'Services automobiles'], vehicle_parts_store: ['transports-mobilite', 'Services automobiles'], vehicle_service: ['transports-mobilite', 'Services automobiles'], gas_station: ['transports-mobilite', 'Services automobiles'],
  train_station: ['transports-mobilite', 'Gares et stations'], airport: ['transports-mobilite', 'Gares et stations'], public_transit_facility_or_service: ['transports-mobilite', 'Gares et stations'], bus_station: ['transports-mobilite', 'Gares et stations'],
  architect: ['maison-travaux', 'Architectes'], home_service: ['maison-travaux', 'Artisans'], building_or_construction_service: ['maison-travaux', 'Construction'], contractor: ['maison-travaux', 'Construction'],
  attorney_or_law_firm: ['droit-finance-conseil', 'Avocats'], legal_service: ['droit-finance-conseil', 'Avocats'], lawyer: ['droit-finance-conseil', 'Avocats'], notary: ['droit-finance-conseil', 'Notaires'], accountant: ['droit-finance-conseil', 'Comptables'], bank_or_credit_union: ['droit-finance-conseil', 'Banques'], bank: ['droit-finance-conseil', 'Banques'], business_consulting: ['droit-finance-conseil', 'Conseil aux entreprises'],
  government_office: ['administrations-services-publics', 'Administrations'], government_department: ['administrations-services-publics', 'Administrations'], courthouse: ['administrations-services-publics', 'Administrations'], community_and_government: ['administrations-services-publics', 'Administrations'],
  embassy: ['administrations-services-publics', 'Ambassades'], town_hall: ['administrations-services-publics', 'Services municipaux'], post_office: ['administrations-services-publics', 'Bureaux de poste'], tourist_information_center: ['administrations-services-publics', 'Offices du tourisme'],
  police_station: ['administrations-services-publics', 'Contacts utiles et urgences'], fire_station: ['administrations-services-publics', 'Contacts utiles et urgences'],
}
// Jamais dans DALIL (décision de Rad, 2026-10-26).
const BANNED = /(^|_)(bar|pub|lounge|dance_club|night_?club|music_venue|adult_entertainment|casino|alcoholic|liquor|winery|brewery|distillery|wine|beer|gaming_venue|comedy_club|psychic|astrolog|christian|jewish|hindu|buddhist|church|synagogue|music_school|musical_instrument)(_|$)/
const BANNED_NAME = /musiq|music|conservatoire|موسيق|zaou[iï]y?a|zawiy?a|زاوية|tidjan|tijan|\bbar\b|\bpub\b|cabaret|night ?club|discoth|brasserie|liquor|\bvins?\b|bi[eè]re|beer|خمر|حانة|ملهى/i
const PUBLIC = new Set(['administrations-services-publics', 'education-formation', 'transports-mobilite'])
const SINGULAR = JSON.parse(readFileSync('scripts/import/singular.json', 'utf8'))

// Fiches déjà dans DALIL (doublons et compléments).
const existing = []
for (const r of JSON.parse(readFileSync(osmPath, 'utf8'))) existing.push({ id: r.id, name: r.name, nameAr: r.nameAr, category: r.category, lat: r.lat, lng: r.lng, phone: r.phone, website: r.website, email: r.email, address: r.address })
for (const r of JSON.parse(readFileSync(openPath, 'utf8'))) if (r.coord) existing.push({ id: r.id, name: r.name, nameAr: r.nameAr, category: r.category, lat: r.coord.lat, lng: r.coord.lng, website: r.website })
for (const r of JSON.parse(readFileSync(researchPath, 'utf8'))) if (r.lat != null) existing.push({ id: r.id, name: r.name, nameAr: r.nameAr, category: r.category, lat: r.lat, lng: r.lng, phone: r.phone, website: r.website, email: r.email, address: r.address })
const grid = new Map()
const put = (p) => grid.set(cell(p), [...(grid.get(cell(p)) ?? []), p])
existing.forEach(put)
const words = (s) => new Set(key(s).split(' ').filter((w) => w.length > 2 && !['mosquee', 'masjid', 'مسجد', 'pharmacie', 'ecole', 'restaurant', 'cafe', 'hotel', 'the', 'les', 'des'].includes(w)))
const similar = (a, b) => {
  const x = words(a)
  const y = words(b)
  if (!x.size || !y.size) return false
  let n = 0
  for (const w of x) if (y.has(w)) n++
  return n / Math.min(x.size, y.size) >= 0.5
}
const first = (v) => (Array.isArray(v) ? v.find(Boolean) ?? null : null)
const social = (list, host) => (Array.isArray(list) ? list.find((u) => typeof u === 'string' && u.includes(host)) ?? null : null)

const selected = []
const complete = {}
const stats = {}
let seen = 0
const rl = createInterface({ input: createReadStream(`${D}/overture-dz.jsonl.gz`).pipe(createGunzip()) })
for await (const line of rl) {
  seen++
  const o = JSON.parse(line)
  const tax = o.taxonomy ?? {}
  const chain = [tax.primary, ...[...(tax.hierarchy ?? [])].reverse(), o.basic_category].filter((x) => typeof x === 'string')
  if (chain.some((c) => BANNED.test(c))) continue
  const hit = chain.map((c) => MAP[c]).find(Boolean)
  if (!hit) continue
  const [sector, category] = hit
  const religious = sector === 'mosquees-priere'
  if ((o.confidence ?? 0) < (religious ? 0.5 : 0.6)) continue
  if (o.operating_status && o.operating_status !== 'open' && typeof o.operating_status === 'string') continue
  const name = (o.names?.primary ?? '').trim()
  if (name.length < 3 || /^\d+$/.test(name) || BANNED_NAME.test(name)) continue
  const p = { lat: o.lat, lng: o.lng }
  const addr = first(o.addresses) ?? {}
  const facts = {
    phone: first(o.phones),
    website: first(o.websites),
    email: first(o.emails),
    facebook: social(o.socials, 'facebook.com'),
    instagram: social(o.socials, 'instagram.com'),
    address: typeof addr.freeform === 'string' && addr.freeform.length > 3 ? addr.freeform : null,
  }
  // Même lieu déjà dans DALIL : on complète seulement ce qui manque.
  const twin = around(grid, p).find((e) => km(p, e) < 0.08 && (similar(e.name, name) || similar(e.nameAr, name) || (e.category === category && km(p, e) < 0.03)))
  if (twin) {
    if (!String(twin.id).startsWith('ovt:')) {
      const fill = Object.fromEntries(Object.entries(facts).filter(([k, v]) => v && !twin[k]))
      if (Object.keys(fill).length) complete[twin.id] = { ...(complete[twin.id] ?? {}), ...fill }
    }
    continue
  }
  const c = nearestCommune(p)
  const w = WILAYAS.find((x) => x.code === c.wilaya)
  if (!w) continue
  const city = c.name
  const ar = /[؀-ۿ]/.test(name)
  const id = `ovt:${o.id}`
  const rec = {
    id,
    provider: 'overture',
    name,
    nameAr: ar ? name : null,
    sector,
    category,
    wilaya: w.name,
    city,
    address: facts.address,
    lat: +o.lat.toFixed(6),
    lng: +o.lng.toFixed(6),
    phone: facts.phone,
    email: facts.email,
    website: facts.website,
    facebook: facts.facebook,
    instagram: facts.instagram,
    intro: `${SINGULAR[category] ?? category} à ${city}, dans la wilaya ${/^[AEIOUÉÈÂÎÏ]/i.test(w.name) ? 'd’' : 'de '}${w.name}.`,
    sourceUrl: 'https://overturemaps.org',
    note: `Overture Maps ${o.id} — © Overture Maps Foundation (CDLA Permissive 2.0). Confiance ${(o.confidence ?? 0).toFixed(2)}.`,
    publicBody: PUBLIC.has(sector) || category === 'Hôpitaux',
  }
  selected.push(rec)
  put({ ...rec })
  stats[category] = (stats[category] ?? 0) + 1
}
const clean = (k, v) => (v === null || (Array.isArray(v) && !v.length) ? undefined : v)
writeFileSync(`${D}/overture-selected.json`, JSON.stringify(selected, clean))
writeFileSync(`${D}/overture-complete.json`, JSON.stringify(complete, clean))
console.log('lus', seen, '· nouvelles fiches', selected.length, '· fiches existantes complétées', Object.keys(complete).length)
console.log(Object.entries(stats).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · '))
