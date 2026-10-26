// Récupère les lieux d’Algérie depuis des sources ouvertes, sans rien copier de Tripadvisor ni de Google :
//   - Wikidata (CC0) : identité, type, coordonnées, wilaya, commune, patrimoine, site officiel, notoriété ;
//   - Wikimedia Commons : photos HD sous licence libre, avec auteur et licence ;
//   - Wikipédia : résumé gardé en NOTE INTERNE pour rédiger nos propres textes (jamais publié tel quel).
// Sortie : src/modules/annuaire/data/open-places.json (versionné, importé par migration).
// Lancé par .github/workflows/import-places.yml (le conteneur de développement n’a pas accès à ces sites).
import { writeFileSync, mkdirSync } from 'node:fs'

const UA = 'DALIL/1.0 (https://www.mydalil.com; salam@mydalil.com)'
const OUT = 'src/modules/annuaire/data/open-places.json'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Catégorie DALIL ← types Wikidata (instance de, ou sous-classe de).
const GROUPS = [
  { sector: 'mosquees-priere', category: 'Mosquées', types: ['Q32815'] },
  { sector: 'culture-nature-loisirs', category: 'Musées', types: ['Q33506'] },
  { sector: 'culture-nature-loisirs', category: 'Monuments et sites historiques', types: ['Q4989906', 'Q1081138', 'Q57821', 'Q16560', 'Q23413', 'Q16970', 'Q2977', 'Q44539', 'Q12518'] },
  { sector: 'culture-nature-loisirs', category: 'Sites archéologiques', types: ['Q839954'] },
  { sector: 'culture-nature-loisirs', category: 'Parcs naturels et réserves', types: ['Q46169', 'Q179049'] },
  { sector: 'culture-nature-loisirs', category: 'Cascades, gorges et grottes', types: ['Q34038', 'Q35509', 'Q150784'] },
  { sector: 'culture-nature-loisirs', category: 'Plages', types: ['Q40080'] },
  { sector: 'culture-nature-loisirs', category: 'Lacs et oasis', types: ['Q23397', 'Q43197'] },
  { sector: 'culture-nature-loisirs', category: 'Parcs', types: ['Q22698'] },
  { sector: 'culture-nature-loisirs', category: 'Jardins', types: ['Q1107656', 'Q167346'] },
  { sector: 'culture-nature-loisirs', category: 'Bibliothèques', types: ['Q7075'] },
  { sector: 'education-formation', category: 'Universités', types: ['Q3918', 'Q38723'] },
  { sector: 'administrations-services-publics', category: 'Ambassades', types: ['Q3917681'] },
  { sector: 'administrations-services-publics', category: 'Consulats', types: ['Q7843791'] },
]

async function sparql(query, tries = 3) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch('https://query.wikidata.org/sparql', {
      method: 'POST',
      headers: { 'user-agent': UA, accept: 'application/sparql-results+json', 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ query }),
    })
    if (res.ok) return (await res.json()).results.bindings
    console.warn('SPARQL', res.status, 'retry', i + 1)
    await sleep(5000 * (i + 1))
  }
  throw new Error('SPARQL failed')
}
const v = (b, k) => b[k]?.value
const qid = (uri) => uri?.split('/').pop()
const point = (wkt) => {
  const m = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(wkt || '')
  return m ? { lat: +m[2], lng: +m[1] } : null
}

// Wilayas : chefs-lieux et noms, pour rattacher chaque lieu.
const provinces = await sparql(`SELECT ?p ?fr ?coord WHERE {
  ?p wdt:P31 wd:Q240601 . OPTIONAL { ?p rdfs:label ?fr FILTER(lang(?fr)='fr') }
  OPTIONAL { ?p wdt:P36/wdt:P625 ?coord } }`)
const PROV = new Map(provinces.map((b) => [qid(v(b, 'p')), { name: v(b, 'fr'), at: point(v(b, 'coord')) }]))
console.log('wilayas', PROV.size)

const places = new Map()
for (const g of GROUPS) {
  const rows = await sparql(`SELECT ?item ?fr ?ar ?en ?coord ?image ?cat ?site ?heritageLabel ?admin ?adminFr ?prov ?frwiki ?enwiki ?arwiki ?links ?inception WHERE {
    VALUES ?type { ${g.types.map((t) => 'wd:' + t).join(' ')} }
    ?item wdt:P31/wdt:P279* ?type ; wdt:P17 wd:Q262 .
    OPTIONAL { ?item rdfs:label ?fr FILTER(lang(?fr)='fr') }
    OPTIONAL { ?item rdfs:label ?ar FILTER(lang(?ar)='ar') }
    OPTIONAL { ?item rdfs:label ?en FILTER(lang(?en)='en') }
    OPTIONAL { ?item wdt:P625 ?coord }
    OPTIONAL { ?item wdt:P18 ?image }
    OPTIONAL { ?item wdt:P373 ?cat }
    OPTIONAL { ?item wdt:P856 ?site }
    OPTIONAL { ?item wdt:P1435 ?heritage }
    OPTIONAL { ?item wdt:P571 ?inception }
    OPTIONAL { ?item wdt:P131 ?admin . ?admin rdfs:label ?adminFr FILTER(lang(?adminFr)='fr') }
    OPTIONAL { ?item wdt:P131* ?prov . ?prov wdt:P31 wd:Q240601 }
    OPTIONAL { ?frwiki schema:about ?item ; schema:isPartOf <https://fr.wikipedia.org/> }
    OPTIONAL { ?enwiki schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> }
    OPTIONAL { ?arwiki schema:about ?item ; schema:isPartOf <https://ar.wikipedia.org/> }
    OPTIONAL { ?item wikibase:sitelinks ?links }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en,ar". ?heritage rdfs:label ?heritageLabel . }
  }`)
  let n = 0
  for (const b of rows) {
    const id = qid(v(b, 'item'))
    const name = v(b, 'fr') || v(b, 'en') || v(b, 'ar')
    if (!name || /^Q\d+$/.test(name)) continue
    const p = places.get(id) || { id, sector: g.sector, category: g.category, name, nameAr: v(b, 'ar') || null, nameEn: v(b, 'en') || null, images: new Set(), heritage: new Set() }
    p.coord ??= point(v(b, 'coord'))
    if (v(b, 'image')) p.images.add(decodeURIComponent(v(b, 'image').split('/').pop()))
    p.commonsCategory ??= v(b, 'cat') || null
    p.website ??= v(b, 'site') || null
    if (v(b, 'heritageLabel')) p.heritage.add(v(b, 'heritageLabel'))
    p.city ??= v(b, 'adminFr') || null
    p.province ??= qid(v(b, 'prov')) || null
    p.wikipedia ??= v(b, 'frwiki') || v(b, 'enwiki') || v(b, 'arwiki') || null
    p.notoriety = Math.max(p.notoriety || 0, +(v(b, 'links') || 0))
    p.inception ??= v(b, 'inception')?.slice(0, 4) || null
    if (!places.has(id)) n++
    places.set(id, p)
  }
  console.log(g.category, rows.length, 'lignes,', n, 'nouveaux lieux')
  await sleep(2000)
}

// Wilaya : par la hiérarchie administrative, sinon chef-lieu le plus proche.
const dist = (a, b) => Math.hypot(a.lat - b.lat, (a.lng - b.lng) * Math.cos((a.lat * Math.PI) / 180))
for (const p of places.values()) {
  let prov = p.province && PROV.get(p.province)
  if (!prov && p.coord) {
    let best = null
    for (const x of PROV.values()) if (x.at && (!best || dist(p.coord, x.at) < dist(p.coord, best.at))) best = x
    prov = best
  }
  p.wilaya = prov?.name?.replace(/^Wilaya (d’|d'|de |du |des )?/i, '') || null
  delete p.province
}

// Commons : photos HD (≥ 1280 px de large), paysage de préférence, avec auteur et licence.
async function commons(params) {
  const url = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({ format: 'json', formatversion: '2', origin: '*', ...params })
  for (let i = 0; i < 3; i++) {
    const res = await fetch(url, { headers: { 'user-agent': UA } })
    if (res.ok) return res.json()
    await sleep(3000 * (i + 1))
  }
  return {}
}
const strip = (html) => (html || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
async function imageInfo(titles) {
  const out = []
  for (let i = 0; i < titles.length; i += 40) {
    const j = await commons({ action: 'query', prop: 'imageinfo', iiprop: 'url|size|extmetadata|mime', iiurlwidth: '1600', titles: titles.slice(i, i + 40).map((t) => 'File:' + t).join('|') })
    for (const pg of j.query?.pages || []) {
      const ii = pg.imageinfo?.[0]
      if (!ii || !/image\/(jpeg|png|webp)/.test(ii.mime)) continue
      const m = ii.extmetadata || {}
      const license = strip(m.LicenseShortName?.value)
      if (!license || /non-free|fair use/i.test(license)) continue
      out.push({ file: pg.title.replace(/^File:/, ''), url: ii.thumburl || ii.url, width: ii.width, height: ii.height, author: strip(m.Artist?.value).slice(0, 160) || 'Auteur inconnu', license, licenseUrl: m.LicenseUrl?.value || null, page: ii.descriptionurl })
    }
    await sleep(300)
  }
  return out
}
let done = 0
for (const p of places.values()) {
  const titles = [...p.images]
  if (p.commonsCategory) {
    const j = await commons({ action: 'query', list: 'categorymembers', cmtitle: 'Category:' + p.commonsCategory, cmtype: 'file', cmlimit: '30' })
    for (const m of j.query?.categorymembers || []) titles.push(m.title.replace(/^File:/, ''))
  }
  const infos = titles.length ? await imageInfo([...new Set(titles)]) : []
  const main = infos.find((x) => p.images.has(x.file))
  const rest = infos
    .filter((x) => x !== main && x.width >= 1280 && x.width >= x.height)
    .sort((a, b) => b.width * b.height - a.width * a.height)
  p.photos = [main, ...rest].filter(Boolean).filter((x) => x.width >= 1024).slice(0, 6)
  delete p.images
  p.heritage = [...p.heritage]
  if (++done % 100 === 0) console.log('photos', done, '/', places.size)
}

// Wikipédia : résumé interne (sert à rédiger nos textes, jamais publié).
const byWiki = [...places.values()].filter((p) => p.wikipedia?.includes('fr.wikipedia'))
for (let i = 0; i < byWiki.length; i += 20) {
  const chunk = byWiki.slice(i, i + 20)
  const titles = chunk.map((p) => decodeURIComponent(p.wikipedia.split('/wiki/')[1]).replace(/_/g, ' '))
  const url = 'https://fr.wikipedia.org/w/api.php?' + new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', prop: 'extracts', exintro: '1', explaintext: '1', exlimit: '20', redirects: '1', titles: titles.join('|') })
  const j = await (await fetch(url, { headers: { 'user-agent': UA } })).json().catch(() => ({}))
  const map = new Map((j.query?.pages || []).map((pg) => [pg.title, pg.extract]))
  const norm = new Map((j.query?.redirects || []).map((r) => [r.from, r.to]))
  chunk.forEach((p, k) => {
    const t = norm.get(titles[k]) || titles[k]
    p.notes = (map.get(t) || '').slice(0, 1500) || null
  })
  await sleep(300)
}

const list = [...places.values()].sort((a, b) => (a.wilaya || '').localeCompare(b.wilaya || '') || b.notoriety - a.notoriety)
mkdirSync('src/modules/annuaire/data', { recursive: true })
writeFileSync(OUT, JSON.stringify({ fetchedAt: new Date().toISOString(), source: 'Wikidata (CC0), Wikimedia Commons (licences libres), Wikipédia (notes internes)', places: list }, null, 1))
console.log('total', list.length, '| avec photo', list.filter((p) => p.photos.length).length, '| avec coordonnées', list.filter((p) => p.coord).length)
