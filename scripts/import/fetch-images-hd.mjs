// Photos HD remarquables (Wikimedia Commons, licences libres) par catégorie Commons : candidats 1920 px, choix final à la main.
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const UA = 'DALIL/1.0 (https://www.mydalil.com; salam@mydalil.com)'
const OUT = 'data/images-hd'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const CATS = {
  'grande-poste': ['Grande Poste d\'Alger'],
  'hotel-ville-oran': ['Hôtel de ville d\'Oran', 'Town hall of Oran'],
  'banque-algerie': ['Bank of Algeria', 'Banque d\'Algérie'],
  metro: ['Algiers Metro', 'Métro d\'Alger'],
  tram: ['Algiers tramway', 'Tramway d\'Alger', 'Constantine tramway', 'Oran tramway'],
  telepherique: ['Aerial tramways in Algeria', 'Téléphérique de Constantine'],
  port: ['Port of Algiers', 'Port d\'Alger'],
  aeroport: ['Houari Boumediene Airport', 'Algiers Houari Boumediene Airport'],
  universite: ['University of Algiers', 'Université d\'Alger'],
  casbah: ['Casbah of Algiers'],
  djamaa: ['Djamaa el Djazaïr'],
  maqam: ['Maqam Echahid'],
  constantine: ['Sidi M\'Cid Bridge', 'Bridges in Constantine'],
  notre: ['Notre-Dame d\'Afrique'],
  ferries: ['Algérie Ferries', 'Ships of Algérie Ferries'],
  gouvernement: ['Palais du Gouvernement (Algiers)'],
  qualite: ['Quality images of Algeria'],
  featured: ['Featured pictures of Algeria'],
  hajj: ['Featured pictures of the Kaaba', 'Masjid al-Haram'],
  alger: ['Views of Algiers', 'Bay of Algiers'],
  oran: ['Views of Oran'],
  ghardaia: ['Ghardaïa'],
  souk: ['Markets in Algeria', 'Souks in Algeria'],
  ecole: ['Schools in Algeria', 'Primary schools in Algeria'],
  hopital: ['Hospitals in Algeria'],
  logement: ['Residential buildings in Algiers', 'Apartment buildings in Algeria'],
  artisanat: ['Handicrafts of Algeria', 'Pottery of Algeria', 'Carpets of Algeria'],
}
async function api(params) {
  const url = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({ format: 'json', formatversion: '2', origin: '*', ...params })
  for (let i = 0; i < 3; i++) {
    const res = await fetch(url, { headers: { 'user-agent': UA } })
    if (res.ok) return res.json()
    await sleep(3000 * (i + 1))
  }
  return {}
}
const strip = (h) => (h || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
const manifest = {}
for (const [key, cats] of Object.entries(CATS)) {
  const found = []
  const seen = new Set()
  for (const c of cats) {
    const j = await api({ action: 'query', generator: 'categorymembers', gcmtitle: 'Category:' + c, gcmtype: 'file', gcmlimit: '60', prop: 'imageinfo', iiprop: 'url|size|extmetadata|mime', iiurlwidth: '1920' })
    for (const pg of j.query?.pages || []) {
      const ii = pg.imageinfo?.[0]
      if (!ii || seen.has(pg.title) || !/image\/(jpeg|png|webp)/.test(ii.mime) || ii.width < 1600 || ii.width < ii.height * 1.2) continue
      const m = ii.extmetadata || {}
      const license = strip(m.LicenseShortName?.value)
      if (!license || /non-free|fair use/i.test(license)) continue
      seen.add(pg.title)
      found.push({ file: pg.title.replace(/^File:/, ''), thumb: ii.thumburl, width: ii.width, height: ii.height, author: strip(m.Artist?.value).slice(0, 160) || 'Auteur inconnu', license, licenseUrl: m.LicenseUrl?.value || null, page: ii.descriptionurl, category: c })
    }
    await sleep(400)
  }
  // Les plus grandes d’abord (souvent les mieux exposées), 12 au plus.
  found.sort((a, b) => b.width * b.height - a.width * a.height)
  const dir = path.join(OUT, key)
  mkdirSync(dir, { recursive: true })
  manifest[key] = []
  for (const [n, f] of found.slice(0, 12).entries()) {
    const res = await fetch(f.thumb, { headers: { 'user-agent': UA } })
    if (!res.ok) continue
    const name = `${n + 1}.jpg`
    writeFileSync(path.join(dir, name), Buffer.from(await res.arrayBuffer()))
    manifest[key].push({ name, ...f })
    await sleep(250)
  }
  console.log(key, manifest[key].length)
}
writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ fetchedAt: new Date().toISOString(), source: 'Wikimedia Commons (licences libres)', topics: manifest }, null, 1))
