// Récupère les 1 541 communes d’Algérie depuis Wikidata (CC0) : nom français et arabe, wilaya, coordonnées du centre.
// Sert au choix de la zone d’intervention des prestataires et au calcul de distance interne (sans service tiers).
// Sortie : src/platform/referentiel/communes.json (versionné).
// Lancé par .github/workflows/import-communes.yml (le conteneur de développement n’a pas accès à Wikidata).
import { readFileSync, writeFileSync } from 'node:fs'

const UA = 'DALIL/1.0 (https://www.mydalil.com; salam@mydalil.com)'
const OUT = 'src/platform/referentiel/communes.json'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Les 58 wilayas « définitives » du référentiel DALIL (les wilayas en transition n’ont pas encore de liste de communes publiée).
const catalog = readFileSync('src/platform/referentiel/catalog.ts', 'utf8')
const WILAYAS = JSON.parse(/export const WILAYAS[^=]*=\s*(\[.*\])/.exec(catalog)[1]).filter((w) => !w.transition)
const norm = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’'`-]/g, ' ')
    .replace(/^(wilaya|province)\s+(d |de |du |des )?/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
const BY_NAME = new Map(WILAYAS.map((w) => [norm(w.name), w.code]))
// Variantes d’écriture rencontrées dans Wikidata.
for (const [alias, code] of [['alger', 16], ['algiers', 16], ['msila', 28], ['m sila', 28], ['el mghair', 57], ['el m ghair', 57], ['el meghaier', 57], ['el menia', 58], ['el meniaa', 58], ['in salah', 53], ['ain salah', 53], ['bordj badji mokhtar', 50], ['beni abbes', 52], ['tamanghasset', 11], ['bechar', 8]]) BY_NAME.set(alias, code)

async function sparql(query, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch('https://query.wikidata.org/sparql', {
      method: 'POST',
      headers: { 'user-agent': UA, accept: 'application/sparql-results+json', 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ query }),
    })
    if (res.ok) return (await res.json()).results.bindings
    console.warn('SPARQL', res.status, 'retry', i + 1)
    await sleep(8000 * (i + 1))
  }
  throw new Error('SPARQL failed')
}
const v = (b, k) => b[k]?.value
const qid = (uri) => uri?.split('/').pop()
const point = (wkt) => {
  const m = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(wkt || '')
  return m ? { lat: Math.round(+m[2] * 1e5) / 1e5, lng: Math.round(+m[1] * 1e5) / 1e5 } : null
}
const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// Commune = entité d’Algérie dont le type porte le libellé « commune… », rattachée (directement ou via sa daïra) à une wilaya.
const rows = await sparql(`SELECT ?c ?fr ?ar ?en ?coord ?provFr ?type WHERE {
  ?prov wdt:P31 wd:Q240601 . ?prov rdfs:label ?provFr FILTER(lang(?provFr)='fr')
  ?c wdt:P131/wdt:P131? ?prov ; wdt:P31 ?type .
  ?type rdfs:label ?tl FILTER(lang(?tl)='fr' && STRSTARTS(LCASE(STR(?tl)), 'commune'))
  OPTIONAL { ?c wdt:P625 ?coord }
  OPTIONAL { ?c rdfs:label ?fr FILTER(lang(?fr)='fr') }
  OPTIONAL { ?c rdfs:label ?ar FILTER(lang(?ar)='ar') }
  OPTIONAL { ?c rdfs:label ?en FILTER(lang(?en)='en') }
}`)
console.log('lignes', rows.length)

const types = new Map()
const out = new Map()
const unmatched = new Set()
for (const b of rows) {
  const id = qid(v(b, 'c'))
  types.set(qid(v(b, 'type')), (types.get(qid(v(b, 'type'))) ?? 0) + 1)
  const wilaya = BY_NAME.get(norm(v(b, 'provFr')))
  if (!wilaya) {
    unmatched.add(v(b, 'provFr'))
    continue
  }
  const name = v(b, 'fr') ?? v(b, 'en')
  if (!name || /^Q\d+$/.test(name)) continue
  const prev = out.get(id)
  if (prev && prev.wilaya !== wilaya) prev.conflict = true
  if (!prev) out.set(id, { id: `${String(wilaya).padStart(2, '0')}-${slug(name)}`, name, ar: v(b, 'ar') ?? null, wilaya, ...(point(v(b, 'coord')) ?? { lat: null, lng: null }), qid: id })
}
console.log('types', Object.fromEntries(types))
console.log('wilayas non reconnues', [...unmatched])

const list = [...out.values()].filter((c) => !c.conflict)
const ids = new Set()
for (const c of list) {
  // Deux communes homonymes dans une même wilaya : on suffixe avec l’identifiant Wikidata.
  if (ids.has(c.id)) c.id = `${c.id}-${c.qid.toLowerCase()}`
  ids.add(c.id)
}
list.sort((a, b) => a.wilaya - b.wilaya || a.name.localeCompare(b.name, 'fr'))
const perWilaya = Object.fromEntries(WILAYAS.map((w) => [w.code, list.filter((c) => c.wilaya === w.code).length]))
console.log('communes', list.length, 'conflits écartés', [...out.values()].filter((c) => c.conflict).length, 'sans coordonnées', list.filter((c) => c.lat == null).length)
console.log('par wilaya', perWilaya)
if (list.length < 1400) throw new Error(`Trop peu de communes (${list.length}) : jeu de données non écrit.`)
writeFileSync(OUT, JSON.stringify(list.map(({ conflict, ...c }) => c)) + '\n')
console.log('écrit', OUT)
