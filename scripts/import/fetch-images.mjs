// Images libres (Wikimedia Commons) pour les pages Démarches : candidats par sujet, avec auteur et licence.
// Lancé par GitHub Actions (le poste de travail n’a pas accès au réseau). Le choix final se fait à la main.
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const UA = 'DALIL/1.0 (https://www.mydalil.com; salam@mydalil.com)'
const OUT = 'data/images-candidates'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const TOPICS = {
  passeport: ['Algerian passport', 'passeport algérien', 'Algeria passport cover'],
  cni: ['Algerian identity card', 'carte nationale identité biométrique Algérie'],
  'auto-entrepreneur': ['artisan Algeria workshop', 'craftsman Algiers shop', 'Ghardaïa artisan'],
  ccr: ['Algérie Ferries', 'ferry port of Algiers', 'Tassili II ferry'],
  logement: ['Alger immeubles logements', 'AADL Algérie', 'housing buildings Algeria'],
  finances: ['Algerian dinar coins', 'dinar algérien pièces', 'Banque d Algérie'],
  documents: ['Algérie Poste bureau', 'administrative documents stamp', 'paperwork documents desk'],
  administrations: ['mairie Algérie APC', 'Hôtel de ville Alger', 'wilaya siège Algérie'],
  entreprise: ['Bab Ezzouar business district', 'Algiers business towers', 'Oran front de mer'],
  installation: ['Houari Boumediene airport terminal', 'aéroport Alger terminal'],
  ambassades: ['embassy of Algeria', 'ambassade d Algérie'],
  urgences: ['Protection civile Algérie', 'ambulance Algeria'],
  ecole: ['école primaire Algérie', 'school Algeria pupils', 'université Alger'],
  sante: ['hôpital Mustapha Pacha', 'hospital Algeria', 'CHU Algérie'],
  transport: ['Algiers tramway', 'Alger métro', 'Oran tramway'],
  internet: ['Algérie Télécom', 'telecommunications tower Algeria'],
  banque: ['bank Algiers', 'Banque extérieure d Algérie', 'Algérie Poste'],
  famille: ['famille algérienne', 'children Algeria school'],
  installation2: ['valise aéroport', 'Algiers airport arrivals hall'],
  pharmacie: ['pharmacie Algérie', 'pharmacy Algiers'],
  services: ['artisan plombier', 'mécanicien garage Algérie'],
  hajj: ['Masjid al-Haram Kaaba pilgrims', 'Hajj pilgrims Mecca'],
  restaurants: ['restaurant Alger', 'café Alger terrasse'],
  musees: ['Musée national des beaux-arts d Alger', 'Bardo museum Algiers'],
  plages: ['plage Algérie', 'beach Algeria Mediterranean'],
  jardins: ['Jardin d Essai du Hamma', 'jardin botanique Hamma Alger'],
  parcs: ['parc d attractions Algérie', 'Ben Aknoun parc'],
  agenda: ['festival Algérie', 'concert Algiers festival'],
  investir: ['port d Alger conteneurs', 'zone industrielle Algérie'],
  droit: ['palais de justice Alger', 'tribunal Algérie'],
  douane: ['douane algérienne', 'port of Oran containers'],
  travail: ['bureau open space Alger', 'office workers Algeria'],
  mosquees: ['Djamaa El Djazaïr', 'Grande Mosquée d Alger'],
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
for (const [key, queries] of Object.entries(TOPICS)) {
  const seen = new Set()
  const found = []
  for (const q of queries) {
    const j = await api({ action: 'query', generator: 'search', gsrsearch: `${q} filetype:bitmap`, gsrnamespace: '6', gsrlimit: '12', prop: 'imageinfo', iiprop: 'url|size|extmetadata|mime', iiurlwidth: '960' })
    for (const pg of (j.query?.pages || []).sort((a, b) => (a.index ?? 0) - (b.index ?? 0))) {
      const ii = pg.imageinfo?.[0]
      if (!ii || seen.has(pg.title) || !/image\/(jpeg|png|webp)/.test(ii.mime) || ii.width < 800) continue
      const m = ii.extmetadata || {}
      const license = strip(m.LicenseShortName?.value)
      if (!license || /non-free|fair use/i.test(license)) continue
      seen.add(pg.title)
      found.push({ file: pg.title.replace(/^File:/, ''), thumb: ii.thumburl, width: ii.width, height: ii.height, author: strip(m.Artist?.value).slice(0, 160) || 'Auteur inconnu', license, licenseUrl: m.LicenseUrl?.value || null, page: ii.descriptionurl, query: q })
    }
    await sleep(400)
  }
  const dir = path.join(OUT, key)
  mkdirSync(dir, { recursive: true })
  manifest[key] = []
  for (const [n, f] of found.slice(0, 8).entries()) {
    const res = await fetch(f.thumb, { headers: { 'user-agent': UA } })
    if (!res.ok) continue
    const name = `${n + 1}.jpg`
    writeFileSync(path.join(dir, name), Buffer.from(await res.arrayBuffer()))
    manifest[key].push({ name, ...f })
    await sleep(300)
  }
  console.log(key, manifest[key].length)
}
writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ fetchedAt: new Date().toISOString(), source: 'Wikimedia Commons (licences libres)', topics: manifest }, null, 1))
