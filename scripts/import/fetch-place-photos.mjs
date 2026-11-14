// Photos sous licence libre pour les lieux publics de DALIL (écoles, mosquées, hôpitaux, administrations, gares, musées…).
// Lancé par GitHub Actions (le poste de travail n’a pas accès au réseau). Sortie : src/modules/annuaire/data/place-photos.json
//
// Sources, de la plus sûre à la moins sûre (une photo fausse est une information fausse : on préfère ne rien mettre) :
//   1. Wikidata : image (P18) de l’élément lié au lieu (fiches Wikidata, ou étiquette wikidata= d’OpenStreetMap).
//   2. OpenStreetMap : étiquette wikimedia_commons= (fichier ou catégorie) posée par les contributeurs sur ce bâtiment précis.
//   3. Commons, recherche géographique : fichier à moins de 150 m dont le titre contient un mot distinctif du nom du lieu.
// Licences libres seulement (CC0, CC BY, CC BY-SA, domaine public) ; auteur, licence et page source gardés pour le crédit.
// Niveau exigé (Rad, 2026-11-14 : « niveau Shutterstock ») : original d’au moins 1600 px de large, format paysage,
// « Quality images » et « Featured pictures » de Commons en premier. Une photo médiocre n’est pas retenue.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const UA = 'DALIL/1.0 (https://www.mydalil.com; salam@mydalil.com)'
const OUT = 'src/modules/annuaire/data/place-photos.json'
const DATA = 'src/modules/annuaire/data'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Rubriques « lieux publics ». Les commerces, restaurants, hôtels et prestataires privés sont exclus. */
const PUBLIC_SECTORS = new Set(['administrations-services-publics', 'education-formation', 'mosquees-priere', 'transports-mobilite', 'culture-nature-loisirs', 'sante-soins'])

const load = (f) => (existsSync(`${DATA}/${f}`) ? JSON.parse(readFileSync(`${DATA}/${f}`, 'utf8')) : [])
const records = [
  ...load('osm-selected.json'),
  ...load('osm-mosques-selected.json'),
  ...load('overture-selected.json'),
  ...load('research-places.json'),
  ...load('open-places-selected.json'),
  ...load('public-bodies.json'),
].filter((r) => r && r.id && (PUBLIC_SECTORS.has(r.sector) || r.publicBody))
console.log('Lieux publics à traiter :', records.length)

async function getJson(url, init = {}) {
  for (let i = 0; i < 4; i++) {
    try {
      const res = await fetch(url, { ...init, headers: { 'user-agent': UA, ...(init.headers || {}) } })
      if (res.ok) return await res.json()
      if (res.status === 429 || res.status >= 500) await sleep(4000 * (i + 1))
      else return null
    } catch {
      await sleep(3000 * (i + 1))
    }
  }
  return null
}
const commons = (p) => getJson('https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({ format: 'json', formatversion: '2', maxlag: '5', ...p }))

// --- Normalisation des noms ---------------------------------------------------------------------------------------
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, ' ').trim()
const GENERIC = new Set(
  ('ecole primaire moyenne lycee cem college coranique mosquee masjid mesdjid djamaa jamaa jamia jami msjd zaouia hopital chu eph epsp ehs clinique centre sante polyclinique salle soins ' +
    'mairie apc daira wilaya siege bureau poste agence direction gare station routiere ferroviaire universite faculte institut superieure national nationale public publique ' +
    'rue cite des de du la le les el al ben bab nouvelle nouveau ancienne ancien grand grande petit petite sidi lalla cheikh imam musee parc jardin plage place stade complexe sportif ' +
    'maternelle creche formation professionnelle cfpa insfp annexe residence universitaire city school mosque hospital museum park station office post town hall nom completer ' +
    'algerie alger oran constantine annaba blida setif batna bejaia tlemcen').split(' '),
)
const tokens = (name) => [...new Set(norm(name).split(' ').filter((t) => t.length >= 4 && !GENERIC.has(t) && !/^\d+$/.test(t)))]
const distM = (a, b) => {
  const r = Math.PI / 180
  const x = (b.lng - a.lng) * r * Math.cos(((a.lat + b.lat) / 2) * r)
  return Math.hypot(x, (b.lat - a.lat) * r) * 6371000
}

// --- 1. Liens OSM → wikidata / wikimedia_commons ------------------------------------------------------------------
async function osmLinks() {
  const q = `[out:json][timeout:900];area["ISO3166-1"="DZ"][admin_level=2]->.a;(nwr(area.a)["wikidata"];nwr(area.a)["wikimedia_commons"];);out tags;`
  for (const host of ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']) {
    const j = await getJson(host, { method: 'POST', body: new URLSearchParams({ data: q }), headers: { 'content-type': 'application/x-www-form-urlencoded' } })
    if (j?.elements) {
      const m = new Map()
      for (const e of j.elements) m.set(`osm:${e.type}/${e.id}`, { wikidata: e.tags?.wikidata, commons: e.tags?.wikimedia_commons })
      return m
    }
  }
  return new Map()
}

// --- 2. Wikidata P18 ----------------------------------------------------------------------------------------------
async function wikidataImages(qids) {
  const out = new Map()
  const list = [...new Set(qids.filter((q) => /^Q\d+$/.test(q)))]
  for (let i = 0; i < list.length; i += 50) {
    const j = await getJson('https://www.wikidata.org/w/api.php?' + new URLSearchParams({ action: 'wbgetentities', ids: list.slice(i, i + 50).join('|'), props: 'claims', format: 'json' }))
    for (const [id, e] of Object.entries(j?.entities || {})) {
      const files = (e.claims?.P18 || []).map((c) => c.mainsnak?.datavalue?.value).filter(Boolean)
      const cat = e.claims?.P373?.[0]?.mainsnak?.datavalue?.value
      const val = (p) => e.claims?.[p]?.[0]?.mainsnak?.datavalue?.value
      // Coordonnées officielles déclarées sur Wikidata : site (P856), téléphone (P1329), email (P968), adresse (P6375).
      const addr = val('P6375')
      const details = { website: val('P856') || null, phone: val('P1329') || null, email: String(val('P968') || '').replace(/^mailto:/, '') || null, address: addr?.text || null }
      out.set(id, { files, category: cat ? `Category:${cat}` : null, details })
    }
    await sleep(300)
  }
  return out
}

async function categoryFiles(category, limit = 12) {
  const j = await commons({ action: 'query', list: 'categorymembers', cmtitle: category, cmtype: 'file', cmlimit: String(limit) })
  return (j?.query?.categorymembers || []).map((m) => m.title.replace(/^File:/, ''))
}

// --- 3. Informations de licence -----------------------------------------------------------------------------------
const QUALITY = ['Category:Quality images', 'Category:Featured pictures on Wikimedia Commons', 'Category:Valued images']
const strip = (h) => String(h || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
const FREE = /^(cc0|cc[ -]by|cc[ -]by-sa|public domain|pd|attribution|fal|gfdl)/i
const infoCache = new Map()
async function fileInfo(files) {
  const need = files.filter((f) => !infoCache.has(f))
  for (let i = 0; i < need.length; i += 40) {
    const j = await commons({ action: 'query', titles: need.slice(i, i + 40).map((f) => `File:${f}`).join('|'), prop: 'imageinfo|categories', iiprop: 'url|size|extmetadata|mime', iiurlwidth: '1600', clcategories: QUALITY.join('|'), cllimit: 'max' })
    for (const pg of j?.query?.pages || []) {
      const ii = pg.imageinfo?.[0]
      const name = pg.title.replace(/^File:/, '')
      if (!ii || !/image\/(jpeg|png|webp)/.test(ii.mime) || ii.width < 1600 || ii.width / ii.height < 1.2) {
        infoCache.set(name, null)
        continue
      }
      const m = ii.extmetadata || {}
      const license = strip(m.LicenseShortName?.value)
      if (!license || !FREE.test(license) || /non-free|fair use/i.test(license)) {
        infoCache.set(name, null)
        continue
      }
      infoCache.set(name, { quality: Boolean(pg.categories?.length), url: ii.thumburl || ii.url, author: strip(m.Artist?.value).slice(0, 160) || 'Auteur inconnu', license, licenseUrl: m.LicenseUrl?.value || null, page: ii.descriptionurl, width: ii.thumbwidth || ii.width, height: ii.thumbheight || ii.height })
    }
    await sleep(250)
  }
  for (const f of need) if (!infoCache.has(f)) infoCache.set(f, null)
  return files.map((f) => infoCache.get(f)).filter(Boolean).sort((a, b) => Number(b.quality) - Number(a.quality))
}

// --- 4. Recherche géographique Commons, avec contrôle du nom ------------------------------------------------------
async function geoMatch(r) {
  const words = tokens(r.name)
  if (!words.length || typeof r.lat !== 'number' || typeof r.lng !== 'number') return []
  const j = await commons({ action: 'query', list: 'geosearch', gscoord: `${r.lat}|${r.lng}`, gsradius: '150', gsnamespace: '6', gslimit: '30' })
  const hits = (j?.query?.geosearch || []).filter((g) => {
    const t = norm(g.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, ''))
    return words.some((w) => t.split(' ').includes(w)) && distM(r, { lat: g.lat, lng: g.lon }) <= 150
  })
  return hits.slice(0, 8).map((g) => g.title.replace(/^File:/, ''))
}

// --- Exécution ----------------------------------------------------------------------------------------------------
const previous = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')).photos || {} : {}
const result = { ...previous }
const details = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')).details || {} : {}
const stats = { wikidata: 0, osmCommons: 0, geo: 0, none: 0 }

const links = await osmLinks()
console.log('Liens OSM (wikidata / commons) :', links.size)
const qids = records.map((r) => (/^Q\d+$/.test(r.id) ? r.id : links.get(r.id)?.wikidata)).filter(Boolean)
const wd = await wikidataImages(qids)
console.log('Éléments Wikidata avec image :', wd.size)

const todo = records.filter((r) => !result[r.id])
let done = 0
async function one(r) {
  let files = []
  let how = ''
  const qid = /^Q\d+$/.test(r.id) ? r.id : links.get(r.id)?.wikidata
  const w = qid ? wd.get(qid) : null
  if (w?.files.length) {
    files = w.files.slice(0, 5)
    how = 'wikidata'
  }
  const c = links.get(r.id)?.commons
  if (!files.length && c) {
    files = /^Category:/i.test(c) ? await categoryFiles(c) : [c.replace(/^File:/i, '')]
    how = 'osmCommons'
  }
  if (!files.length && w?.category) {
    files = await categoryFiles(w.category)
    how = 'wikidata'
  }
  if (!files.length) {
    files = await geoMatch(r)
    how = 'geo'
  }
  const d = w?.details
  if (d && (d.website || d.phone || d.email || d.address)) details[r.id] = { ...d, source: `https://www.wikidata.org/wiki/${qid}` }
  const photos = files.length ? await fileInfo(files) : []
  if (photos.length) {
    result[r.id] = photos.slice(0, 3).map((p) => ({ ...p, via: how }))
    stats[how]++
  } else stats.none++
  if (++done % 500 === 0) {
    console.log(done, '/', todo.length, JSON.stringify(stats))
    writeFileSync(OUT, JSON.stringify({ fetchedAt: new Date().toISOString(), source: 'Wikimedia Commons / Wikidata / OpenStreetMap (licences libres)', photos: result, details }))
  }
}
// 4 requêtes en parallèle : respect des limites de Wikimedia.
for (let i = 0; i < todo.length; i += 4) await Promise.all(todo.slice(i, i + 4).map(one))

writeFileSync(OUT, JSON.stringify({ fetchedAt: new Date().toISOString(), source: 'Wikimedia Commons / Wikidata / OpenStreetMap (licences libres)', photos: result, details }))
console.log('Terminé', JSON.stringify(stats), 'lieux avec photo :', Object.keys(result).length, 'avec coordonnées Wikidata :', Object.keys(details).length)
