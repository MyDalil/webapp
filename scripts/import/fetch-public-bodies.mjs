// Institutions publiques d’Algérie depuis Wikidata (CC0) : ministères, ambassades et consulats en Algérie, agences et
// établissements de l’État, tribunaux, hôpitaux, universités, musées, bibliothèques, gares et aéroports.
// Faits seulement (nom, coordonnées, site, téléphone, email, adresse). Lancé par GitHub Actions.
// Sortie : src/modules/annuaire/data/public-bodies.json (ImportRecord[], importé par migration de données).
import { writeFileSync } from 'node:fs'

const UA = 'DALIL/1.0 (https://www.mydalil.com; salam@mydalil.com)'
const OUT = 'src/modules/annuaire/data/public-bodies.json'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// [classe Wikidata, rubrique DALIL, catégorie DALIL, organisme public]
const CLASSES = [
  ['Q192350', 'administrations-services-publics', 'Ministères', true], // ministère
  ['Q3917681', 'administrations-services-publics', 'Ambassades', true], // ambassade
  ['Q7843791', 'administrations-services-publics', 'Consulats', true], // consulat
  ['Q327333', 'administrations-services-publics', 'Administrations', true], // agence gouvernementale
  ['Q2659904', 'administrations-services-publics', 'Administrations', true], // organisation gouvernementale
  ['Q41487', 'administrations-services-publics', 'Administrations', true], // tribunal
  ['Q16917', 'sante-soins', 'Hôpitaux', true], // hôpital
  ['Q38723', 'education-formation', 'Universités', true], // établissement d’enseignement supérieur
  ['Q33506', 'culture-nature-loisirs', 'Musées', true], // musée
  ['Q7075', 'culture-nature-loisirs', 'Bibliothèques', true], // bibliothèque
  ['Q55488', 'transports-mobilite', 'Gares et stations', true], // gare ferroviaire
  ['Q1248784', 'transports-mobilite', 'Gares et stations', true], // aéroport
]

async function sparql(q) {
  for (let i = 0; i < 5; i++) {
    try {
      const res = await fetch('https://query.wikidata.org/sparql?' + new URLSearchParams({ query: q, format: 'json' }), { headers: { 'user-agent': UA, accept: 'application/sparql-results+json' } })
      if (res.ok) return (await res.json()).results.bindings
      console.log('SPARQL', res.status, 'essai', i + 1)
    } catch (e) {
      console.log('SPARQL', e.message, 'essai', i + 1)
    }
    await sleep(15000 * (i + 1))
  }
  return []
}

// Présentation factuelle (deux ou trois mots de nature + lieu) : jamais d’avis, jamais d’information non sourcée.
const NATURE = {
  Ministères: 'Ministère du gouvernement algérien',
  Ambassades: 'Représentation diplomatique',
  Consulats: 'Représentation consulaire',
  Administrations: 'Institution publique algérienne',
  Hôpitaux: 'Établissement hospitalier',
  Universités: 'Établissement d’enseignement supérieur',
  Musées: 'Musée',
  Bibliothèques: 'Bibliothèque',
  'Gares et stations': 'Gare ou aéroport',
}
const v = (b, k) => b[k]?.value ?? null
const qid = (u) => (u ? u.split('/').pop() : null)
const out = new Map()
for (const [cls, sector, category, publicBody] of CLASSES) {
  const rows = await sparql(`
SELECT ?item ?fr ?ar ?en ?coord ?website ?phone ?email ?address ?wilayaLabel ?cityLabel WHERE {
  ?item wdt:P31/wdt:P279* wd:${cls} ; wdt:P17 wd:Q262 .
  FILTER NOT EXISTS { ?item wdt:P576 [] }
  FILTER NOT EXISTS { ?item wdt:P3999 [] }
  OPTIONAL { ?item rdfs:label ?fr FILTER(lang(?fr) = "fr") }
  OPTIONAL { ?item rdfs:label ?ar FILTER(lang(?ar) = "ar") }
  OPTIONAL { ?item rdfs:label ?en FILTER(lang(?en) = "en") }
  OPTIONAL { ?item wdt:P625 ?coord }
  OPTIONAL { ?item wdt:P856 ?website }
  OPTIONAL { ?item wdt:P1329 ?phone }
  OPTIONAL { ?item wdt:P968 ?email }
  OPTIONAL { ?item wdt:P6375 ?address FILTER(lang(?address) IN ("fr", "en", "ar")) }
  OPTIONAL { ?item wdt:P131* ?w . ?w wdt:P31 wd:Q240601 . ?w rdfs:label ?wilayaLabel FILTER(lang(?wilayaLabel) = "fr") }
  OPTIONAL { ?item wdt:P131 ?c . ?c rdfs:label ?cityLabel FILTER(lang(?cityLabel) = "fr") }
}`)
  let n = 0
  for (const b of rows) {
    const id = qid(v(b, 'item'))
    const name = v(b, 'fr') || v(b, 'en') || v(b, 'ar')
    if (!id || !name || /^Q\d+$/.test(name) || out.has(id)) continue
    const m = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(v(b, 'coord') || '')
    const wilaya = (v(b, 'wilayaLabel') || '').replace(/^(province|wilaya) d(e |’|')/i, '').trim() || null
    out.set(id, {
      id,
      provider: 'wikidata',
      name,
      nameAr: v(b, 'ar'),
      sector,
      category,
      wilaya,
      city: v(b, 'cityLabel'),
      address: v(b, 'address'),
      lat: m ? Number(m[2]) : null,
      lng: m ? Number(m[1]) : null,
      phone: v(b, 'phone'),
      email: (v(b, 'email') || '').replace(/^mailto:/, '') || null,
      website: v(b, 'website'),
      intro: `${NATURE[category]}${v(b, 'cityLabel') ? ` à ${v(b, 'cityLabel')}` : ''}${wilaya ? `, dans la wilaya ${/^[AEIOUÉÈÂÎ]/i.test(wilaya) ? 'd’' : 'de '}${wilaya}` : ''}.`,
      sourceUrl: `https://www.wikidata.org/wiki/${id}`,
      note: `Wikidata ${id} (CC0) — à vérifier par DALIL.`,
      publicBody,
    })
    n++
  }
  console.log(category, cls, rows.length, 'lignes,', n, 'institutions')
  await sleep(2000)
}
writeFileSync(OUT, JSON.stringify([...out.values()]))
console.log('Total', out.size)
