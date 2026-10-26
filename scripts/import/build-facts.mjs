// Construit les faits « En bref » de chaque lieu à partir des faits bruts (OSM ODbL + Wikidata CC0).
// Entrée : osm-facts.json + wikidata-facts.json (branche import-data, action « Import des faits »).
// Sortie : src/modules/annuaire/data/place-facts.json = { identifiant source : [{ label, value }] } — importé par migration.
// Règle : seulement des faits explicites de la source ; une valeur inconnue n’est jamais traduite au hasard (elle est omise).
// Usage : node scripts/import/build-facts.mjs <osm-facts.json> <wikidata-facts.json>
import { readFileSync, writeFileSync } from 'node:fs'

const [osmPath, wdPath] = process.argv.slice(2)
const osm = JSON.parse(readFileSync(osmPath, 'utf8'))
const { items: wd, labels } = JSON.parse(readFileSync(wdPath, 'utf8'))
const DATA = 'src/modules/annuaire/data'
const open = JSON.parse(readFileSync(`${DATA}/open-places-selected.json`, 'utf8'))
const selected = JSON.parse(readFileSync(`${DATA}/osm-selected.json`, 'utf8'))

const yes = (v) => /^(yes|only|designated)$/.test(v ?? '')
const num = (v) => (/^\d{1,6}$/.test(String(v ?? '').trim()) ? Number(v) : null)
const fr = (n) => n.toLocaleString('fr-FR')
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const CUISINE = { algerian: 'algérienne', moroccan: 'marocaine', tunisian: 'tunisienne', lebanese: 'libanaise', syrian: 'syrienne', turkish: 'turque', italian: 'italienne', pizza: 'pizza', french: 'française', chinese: 'chinoise', japanese: 'japonaise', sushi: 'sushis', indian: 'indienne', mexican: 'mexicaine', burger: 'burgers', sandwich: 'sandwichs', kebab: 'kebab', chicken: 'poulet', fish: 'poisson', seafood: 'fruits de mer', grill: 'grillades', barbecue: 'grillades', regional: 'régionale', traditional: 'traditionnelle', mediterranean: 'méditerranéenne', oriental: 'orientale', arab: 'arabe', fast_food: 'restauration rapide', coffee_shop: 'café', ice_cream: 'glaces', pastry: 'pâtisserie', crepe: 'crêpes', tacos: 'tacos', steak_house: 'viandes', couscous: 'couscous', tea: 'thé', juice: 'jus', breakfast: 'petit-déjeuner', international: 'internationale', asian: 'asiatique', american: 'américaine', spanish: 'espagnole', greek: 'grecque', vegetarian: 'végétarienne', salad: 'salades', bakery: 'boulangerie', dessert: 'desserts', cake: 'gâteaux', donut: 'beignets', chawarma: 'chawarma', shawarma: 'chawarma', local: 'locale' }
const SPECIALITY = { general: 'médecine générale', dentistry: 'dentaire', paediatrics: 'pédiatrie', gynaecology: 'gynécologie', obstetrics: 'obstétrique', ophthalmology: 'ophtalmologie', cardiology: 'cardiologie', dermatology: 'dermatologie', orthopaedics: 'orthopédie', radiology: 'radiologie', otolaryngology: 'ORL', psychiatry: 'psychiatrie', neurology: 'neurologie', urology: 'urologie', oncology: 'oncologie', surgery: 'chirurgie', general_surgery: 'chirurgie générale', internal: 'médecine interne', emergency: 'urgences', physiotherapy: 'kinésithérapie', gastroenterology: 'gastro-entérologie', endocrinology: 'endocrinologie', nephrology: 'néphrologie', pulmonology: 'pneumologie', rheumatology: 'rhumatologie', biology: 'biologie médicale', pathology: 'anatomopathologie', anaesthetics: 'anesthésie', maternity: 'maternité', diabetology: 'diabétologie', orthodontics: 'orthodontie', infectious_diseases: 'maladies infectieuses', haematology: 'hématologie', nutrition: 'nutrition', occupational: 'médecine du travail', family: 'médecine familiale', plastic_surgery: 'chirurgie esthétique', vascular_surgery: 'chirurgie vasculaire', neurosurgery: 'neurochirurgie', allergology: 'allergologie', speech_therapy: 'orthophonie', psychology: 'psychologie' }
const DENOM = { sunni: 'Sunnite', ibadi: 'Ibadite', maliki: 'Malékite', sufi: 'Soufie', hanafi: 'Hanafite' }
const ISCED = { 0: 'Préscolaire', 1: 'Primaire', 2: 'Moyen', 3: 'Secondaire', 4: 'Post-secondaire', 5: 'Supérieur', 6: 'Licence', 7: 'Master', 8: 'Doctorat' }
const list = (v, dict) => [...new Set(String(v).split(/[;,]/).map((x) => dict[x.trim().toLowerCase()]).filter(Boolean))]
const year = (v) => {
  const m = String(v ?? '').match(/^(-?)(\d{3,4})/)
  if (!m) return null
  return m[1] ? null : String(Number(m[2]))
}

function fromOsm(t) {
  const f = []
  const add = (label, value) => value && f.push({ label, value: String(value), source: 'osm' })
  if (t.wheelchair) add('Accès fauteuil', { yes: 'Oui', limited: 'Partiel', no: 'Non', designated: 'Oui' }[t.wheelchair])
  if (yes(t['toilets:wheelchair'])) add('Toilettes adaptées', 'Oui')
  else if (yes(t.toilets)) add('Toilettes', 'Sur place')
  if (/^(wlan|yes|wifi)$/.test(t.internet_access ?? '')) add('Wi-Fi', t['internet_access:fee'] === 'no' ? 'Gratuit' : 'Disponible')
  if (t.cuisine) add('Cuisine', list(t.cuisine, CUISINE).slice(0, 3).map(cap).join(', '))
  if (yes(t['diet:halal'])) add('Halal', 'Oui')
  if (yes(t.outdoor_seating)) add('Terrasse', 'Oui')
  if (yes(t.takeaway)) add('À emporter', 'Oui')
  if (yes(t.delivery)) add('Livraison', 'Oui')
  const stars = num(t.stars)
  if (stars && stars <= 5) add('Classement', `${stars} étoile${stars > 1 ? 's' : ''}`)
  if (num(t.rooms)) add('Chambres', fr(num(t.rooms)))
  if (num(t.beds)) add('Lits', fr(num(t.beds)))
  if (yes(t.emergency)) add('Urgences', 'Oui')
  if (t['healthcare:speciality']) add('Spécialités', list(t['healthcare:speciality'], SPECIALITY).slice(0, 4).map(cap).join(', '))
  if (t.denomination) add('Rite', DENOM[t.denomination])
  if (num(t.capacity)) add('Capacité', `${fr(num(t.capacity))} places`)
  if (year(t.start_date)) add('Création', year(t.start_date))
  if (t.heritage && /^\d$/.test(t.heritage)) add('Patrimoine', 'Monument classé')
  if (/^(public|government|governmental|religious)$/.test(t['operator:type'] ?? '')) add('Statut', 'Public')
  else if (/^(private|private_non_profit|business)$/.test(t['operator:type'] ?? '')) add('Statut', 'Privé')
  const cards = ['cib', 'edahabia'].filter((k) => yes(t[`payment:${k}`])).map((k) => ({ cib: 'CIB', edahabia: 'Edahabia' })[k])
  if (cards.length) add('Paiement', `Carte ${cards.join(', ')}`)
  else if (yes(t['payment:cards']) || yes(t['payment:credit_cards']) || yes(t['payment:debit_cards'])) add('Paiement', 'Carte bancaire')
  if (yes(t.air_conditioning)) add('Climatisation', 'Oui')
  if (t.smoking === 'no') add('Non-fumeur', 'Oui')
  if (t.fee === 'no') add('Entrée', 'Gratuite')
  else if (t.fee === 'yes') add('Entrée', 'Payante')
  if (yes(t.atm)) add('Distributeur', 'Sur place')
  if (yes(t.drive_through)) add('Service au volant', 'Oui')
  if (t['isced:level']) add('Niveau', [...new Set(String(t['isced:level']).split(/[;,-]/).map((x) => ISCED[x.trim()]).filter(Boolean))].join(', '))
  if (yes(t.female)) add('Accueil', 'Réservé aux femmes')
  if (t.reservation) add('Réservation', { yes: 'Possible', required: 'Obligatoire', recommended: 'Conseillée', no: 'Sans réservation' }[t.reservation])
  if (yes(t.dispensing)) add('Ordonnances', 'Délivrées')
  if (/^\d{1,2}:\d{2}$/.test(t.check_in ?? '')) add('Arrivée', `À partir de ${t.check_in}`)
  if (/^\d{1,2}:\d{2}$/.test(t.check_out ?? '')) add('Départ', `Avant ${t.check_out}`)
  const levels = num(t['building:levels'] ?? t.levels)
  if (levels && levels > 1 && levels < 80) add('Étages', fr(levels))
  if (t.operator && t.operator.length <= 80) add('Gestion', t.operator)
  return f
}

const label = (v) => (v?.item ? labels[v.item] : null)
function fromWikidata(e) {
  const f = []
  const add = (l, value) => value && f.push({ label: l, value: String(value), source: 'wikidata' })
  if (!e) return f
  const her = [...new Set((e.heritage ?? []).map(label).filter(Boolean))]
  if (her.length) add('Patrimoine', cap(her.slice(0, 2).join(', ')))
  if (e.inception?.length) add('Création', year(e.inception[0]))
  const style = [...new Set((e.style ?? []).map(label).filter(Boolean))]
  if (style.length) add('Style', cap(style.slice(0, 2).join(', ')))
  const arch = [...new Set((e.architect ?? []).map(label).filter(Boolean))]
  if (arch.length) add('Architecte', arch.slice(0, 2).join(', '))
  const capa = e.capacity?.[0]?.amount
  if (capa && capa > 0 && capa < 1e6) add('Capacité', `${fr(Math.round(capa))} places`)
  const el = e.elevation?.[0]
  if (el && el.unit === 'Q11573') add('Altitude', `${fr(Math.round(el.amount))} m`)
  const area = e.area?.[0]
  if (area && ['Q712226', 'Q25343', 'Q35852'].includes(area.unit)) add('Superficie', `${fr(+area.amount.toFixed(2))} ${{ Q712226: 'km²', Q25343: 'm²', Q35852: 'ha' }[area.unit]}`)
  const fl = e.floors?.[0]?.amount
  if (fl && fl > 1 && fl < 200) add('Étages', fr(fl))
  if (e.opening?.length && year(e.opening[0])) add('Ouverture', year(e.opening[0]))
  const op = [...new Set((e.operator ?? []).map(label).filter(Boolean))]
  if (op.length) add('Gestion', op[0])
  return f
}

const merge = (...lists) => {
  const seen = new Set()
  return lists.flat().filter((x) => x.value && !seen.has(x.label) && seen.add(x.label))
}
const out = {}
let n = 0
for (const p of open) {
  const f = merge(fromWikidata(wd[p.id]))
  if (f.length) (out[p.id] = f), n++
}
for (const p of selected) {
  const raw = p.id.replace(/^osm:/, '')
  const t = osm[raw]
  const f = merge(t ? fromOsm(t) : [], t?.wikidata ? fromWikidata(wd[t.wikidata]) : [])
  if (f.length) (out[p.id] = f), n++
}
writeFileSync(`${DATA}/place-facts.json`, JSON.stringify(out))
const byLabel = {}
for (const f of Object.values(out).flat()) byLabel[f.label] = (byLabel[f.label] ?? 0) + 1
console.log('fiches enrichies', n, byLabel)
