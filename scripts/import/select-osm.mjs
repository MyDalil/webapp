// Sélectionne les lieux OpenStreetMap publiables (qualité, pas de doublons) et rédige une présentation factuelle.
// Entrée : src/modules/annuaire/data/osm-places.json (+ research-places.json et open-places-selected.json pour les doublons).
// Sortie : src/modules/annuaire/data/osm-selected.json.
import { readFileSync, writeFileSync } from 'node:fs'

const D = 'src/modules/annuaire/data'
const raw = JSON.parse(readFileSync(`${D}/osm-places.json`, 'utf8'))
const research = JSON.parse(readFileSync(`${D}/research-places.json`, 'utf8'))
const wikidata = JSON.parse(readFileSync(`${D}/open-places-selected.json`, 'utf8'))
const communes = JSON.parse(readFileSync('src/platform/referentiel/communes.json', 'utf8')).filter((c) => c.lat != null)
const WILAYAS = [...readFileSync('src/platform/referentiel/catalog.ts', 'utf8').matchAll(/\{"code":(\d+),"name":"([^"]+)"/g)].map((m) => ({ code: +m[1], name: m[2] }))
const key = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’'`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
const wByKey = new Map(WILAYAS.map((w) => [key(w.name), w.name]))

const km = (a, b) => {
  const r = Math.PI / 180
  const x = (b.lng - a.lng) * r * Math.cos(((a.lat + b.lat) / 2) * r)
  const y = (b.lat - a.lat) * r
  return Math.sqrt(x * x + y * y) * 6371
}
const nearest = (p) => {
  let best = null
  let d = Infinity
  for (const c of communes) {
    const k = km(p, c)
    if (k < d) { d = k; best = c }
  }
  return best
}

// Toujours utiles même sans contact (repères officiels) ; les autres doivent avoir au moins un fait pratique.
const ESSENTIAL = new Set(['Hôpitaux', 'Universités', 'Mosquées', 'Écoles', 'Écoles coraniques', 'Bureaux de poste', 'Ambassades', 'Consulats', 'Gares et stations', 'Offices du tourisme', 'Services municipaux', 'Contacts utiles et urgences'])
const SINGULAR = {
  Hôpitaux: 'Hôpital', Cliniques: 'Clinique', Pharmacies: 'Pharmacie', Médecins: 'Cabinet médical', Laboratoires: 'Laboratoire d’analyses',
  Universités: 'Établissement d’enseignement supérieur', 'Formation professionnelle': 'Établissement de formation', Écoles: 'École', Crèches: 'Crèche ou jardin d’enfants', 'Écoles de langues': 'École de langues',
  Mosquées: 'Mosquée', 'Écoles coraniques': 'École coranique', 'Services municipaux': 'Mairie (APC)', 'Bureaux de poste': 'Bureau de poste', Administrations: 'Service public', Ambassades: 'Ambassade', Consulats: 'Consulat',
  'Offices du tourisme': 'Point d’information touristique', 'Contacts utiles et urgences': 'Service de sécurité ou de secours', Banques: 'Agence bancaire', Notaires: 'Étude notariale', Avocats: 'Cabinet d’avocat',
  'Gares et stations': 'Gare ou station', 'Bureaux de poste': 'Bureau de poste', 'Salons de thé': 'Salon de thé', Traiteurs: 'Traiteur', Spas: 'Spa', 'Soins esthétiques': 'Institut de beauté', 'Clubs sportifs': 'Club sportif', 'Salles de prière': 'Salle de prière', 'Associations caritatives et entraide': 'Association d’entraide', 'Pompes funèbres musulmanes et toilette mortuaire': 'Pompes funèbres', 'Équipement de la maison': 'Magasin d’équipement de la maison', Transporteurs: 'Transporteur', Déménagement: 'Entreprise de déménagement', Architectes: 'Cabinet d’architecte', Artisans: 'Artisan', Construction: 'Entreprise de construction', Comptables: 'Cabinet comptable', 'Conseil aux entreprises': 'Cabinet de conseil', 'Agences Omra & Hajj': 'Agence Omra et Hajj', Hijama: 'Centre de hijama', 'Instituts d’arabe et de sciences islamiques': 'Institut d’arabe et de sciences islamiques', 'Salles de sport pour femmes': 'Salle de sport pour femmes', 'Librairies islamiques': 'Librairie islamique', 'Location de véhicules': 'Agence de location de véhicules', 'Services automobiles': 'Service automobile', Hôtels: 'Hôtel', 'Maisons d’hôtes': 'Maison d’hôtes', 'Agences de voyages': 'Agence de voyages',
  Restaurants: 'Restaurant', Cafés: 'Café', Pâtisseries: 'Pâtisserie', Glaciers: 'Glacier', Hammams: 'Hammam', 'Salles de sport': 'Salle de sport', 'Installations sportives': 'Équipement sportif',
  Alimentation: 'Commerce alimentaire', Librairies: 'Librairie', Habillement: 'Boutique de vêtements', 'Agences immobilières': 'Agence immobilière',
}
const DAYS = { Mo: 'lun.', Tu: 'mar.', We: 'mer.', Th: 'jeu.', Fr: 'ven.', Sa: 'sam.', Su: 'dim.' }
const hours = (oh) => {
  if (!oh) return []
  if (/^24\/7$/.test(oh.trim())) return [{ days: 'Tous les jours', time: '24 h/24' }]
  const parts = oh.split(/\s*;\s*/).map((p) => /^([A-Za-z,\- ]+)\s+([\d:,\- ]+|off|closed)$/i.exec(p.trim()))
  if (!parts.length || !parts.every(Boolean)) return [{ days: 'Horaires (OpenStreetMap)', time: oh.slice(0, 120) }]
  return parts.map((m) => ({ days: m[1].replace(/[A-Z][a-z]/g, (d) => DAYS[d] ?? d).replace(/-/g, ' – '), time: /off|closed/i.test(m[2]) ? 'Fermé' : m[2].replace(/:/g, 'h').replace(/-/g, ' – ') }))
}
const phone = (p) => (p ? p.split(/[;,]/)[0].trim() : null)

const taken = new Map() // nom|wilaya → coordonnées
for (const r of [...research, ...wikidata]) {
  const w = r.wilaya ?? null
  taken.set(`${key(r.name)}|${key(w)}`, r.lat != null ? { lat: r.lat, lng: r.lng } : r.coord ?? null)
}

const out = []
const stats = {}
// Catégories précises repérées au nom (jamais devinées autrement).
const BY_NAME = [
  [/omra|umra|hajj|عمرة|حج/i, ['Agences de voyages'], 'mosquees-priere', 'Agences Omra & Hajj'],
  [/hijama|hidjama|حجامة/i, null, 'sante-soins', 'Hijama'],
  [/\b(femmes?|dames?|lad(y|ies)|women)\b|نساء|سيدات/i, ['Salles de sport'], 'bien-etre-sport', 'Salles de sport pour femmes'],
  [/\b(arabe|coran|quran|charia|islamique)\b|معهد|شريعة|قرآن/i, ['Écoles de langues', 'Formation professionnelle'], 'mosquees-priere', 'Instituts d’arabe et de sciences islamiques'],
  [/\b(islam|islamique|coran)\b|إسلامي|قرآن/i, ['Librairies'], 'mosquees-priere', 'Librairies islamiques'],
]
// Les écoles coraniques passent avant les écoles (même objet OSM possible dans les deux groupes).
raw.sort((a, b) => (b.category === 'Écoles coraniques') - (a.category === 'Écoles coraniques'))
const POST = /\b(poste|bureau de poste|algerie poste|algérie poste|ptt)\b|بريد/i
for (const p of raw) {
  // Les bureaux de poste ont leur propre catégorie (repérés au nom ou à l’opérateur Algérie Poste).
  if (p.category === 'Administrations' && (POST.test(p.name ?? '') || /poste/i.test(p.operator ?? ''))) p.category = 'Bureaux de poste'
  for (const [re, from, sector, category] of BY_NAME) {
    if ((!from || from.includes(p.category)) && re.test(`${p.name ?? ''} ${p.nameAr ?? ''}`)) { p.sector = sector; p.category = category; break }
  }
  if (!p.name || p.name.length < 3 || /^\d+$/.test(p.name)) continue
  const practical = p.phone || p.website || p.street || p.hours || p.email
  if (!ESSENTIAL.has(p.category) && !practical) continue
  const c = nearest(p)
  const wName = (p.wilaya && wByKey.get(key(p.wilaya))) || WILAYAS.find((w) => w.code === c?.wilaya)?.name
  if (!wName) continue
  const k = `${key(p.name)}|${key(wName)}`
  if (taken.has(k)) continue
  taken.set(k, { lat: p.lat, lng: p.lng })
  const city = p.city || c?.name || wName
  const bits = [`${SINGULAR[p.category] ?? p.category} à ${city} (wilaya de ${wName}).`]
  if (p.operator && key(p.operator) !== key(p.name)) bits.push(`Géré par ${p.operator}.`)
  if (p.wheelchair === 'yes') bits.push('Accès en fauteuil roulant signalé.')
  bits.push('Informations issues d’OpenStreetMap, à vérifier par DALIL.')
  out.push({
    id: `osm:${p.id}`,
    provider: 'osm',
    name: p.name,
    nameAr: p.nameAr,
    sector: p.sector,
    category: p.category,
    wilaya: wName,
    city,
    address: p.street ? `${p.street}, ${city}` : null,
    lat: p.lat,
    lng: p.lng,
    phone: phone(p.phone),
    email: p.email,
    website: p.website,
    hours: hours(p.hours),
    intro: bits.join(' '),
    sourceUrl: `https://www.openstreetmap.org/${p.id}`,
    note: `OpenStreetMap ${p.id} — © les contributeurs OpenStreetMap (ODbL).`,
  })
  stats[p.category] = (stats[p.category] ?? 0) + 1
}
writeFileSync(`${D}/osm-selected.json`, JSON.stringify(out, (k, v) => (v === null || (Array.isArray(v) && !v.length) ? undefined : v)))
console.log('brut', raw.length, '· retenus', out.length)
console.log(Object.entries(stats).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · '))
