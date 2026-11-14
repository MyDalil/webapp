// Photos haut de gamme pour les lieux publics, depuis les banques gratuites à usage commercial :
// Pexels (licence Pexels), Pixabay (licence Pixabay), Unsplash (licence Unsplash, photos Unsplash+ exclues).
// Deux usages : (1) photo d’illustration par catégorie (« Photo d’illustration » affichée) ; (2) vraie photo d’un lieu
// connu quand le texte de la photo cite son nom. Le choix final se fait à l’œil (candidats téléchargés en vignettes).
// Clés : secrets GitHub PEXELS_API_KEY, PIXABAY_API_KEY, UNSPLASH_ACCESS_KEY (une clé absente = banque ignorée).
// Sortie : data/stock-candidates/<catégorie>/<n>.jpg + data/stock-candidates/manifest.json
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const OUT = 'data/stock-candidates'
const UA = 'DALIL/1.0 (https://www.mydalil.com; salam@mydalil.com)'
const { PEXELS_API_KEY: PEXELS, PIXABAY_API_KEY: PIXABAY, UNSPLASH_ACCESS_KEY: UNSPLASH } = process.env
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Catégorie DALIL → recherches (Algérie d’abord, puis Maghreb, puis générique soigné). */
const TOPICS = {
  ecoles: ['algeria school', 'algerian pupils classroom', 'north africa school building', 'school classroom sunlight'],
  universites: ['algiers university', 'algeria university campus', 'university campus architecture'],
  creches: ['kindergarten classroom colorful', 'preschool children playing'],
  mosquees: ['algeria mosque', 'algiers mosque', 'djamaa el djazair', 'maghreb mosque minaret'],
  'ecoles-coraniques': ['quran reading', 'quran school children', 'islamic calligraphy quran'],
  hopitaux: ['algeria hospital', 'modern hospital building', 'hospital corridor clean'],
  ministeres: ['algiers government building', 'algiers architecture white', 'government palace facade'],
  ambassades: ['embassy building flags', 'diplomatic building facade'],
  'services-municipaux': ['algeria town hall', 'algiers city hall', 'oran city hall'],
  'bureaux-de-poste': ['grande poste alger', 'algiers post office', 'post office counter'],
  administrations: ['algiers boulevard architecture', 'administrative building facade', 'office documents stamp'],
  gares: ['algiers train station', 'algeria train', 'algiers airport', 'algiers tramway'],
  musees: ['algeria museum', 'bardo museum algiers', 'museum gallery interior'],
  bibliotheques: ['library reading room', 'library bookshelves'],
  'offices-du-tourisme': ['algiers tourism', 'algeria travel landscape', 'casbah algiers'],
  urgences: ['ambulance emergency', 'firefighters truck', 'civil protection rescue'],
}

async function getJson(url, headers = {}) {
  for (let i = 0; i < 3; i++) {
    const res = await fetch(url, { headers: { 'user-agent': UA, ...headers } }).catch(() => null)
    if (res?.ok) return res.json()
    await sleep(3000 * (i + 1))
  }
  return null
}

async function pexels(q) {
  if (!PEXELS) return []
  const j = await getJson(`https://api.pexels.com/v1/search?${new URLSearchParams({ query: q, per_page: '30', orientation: 'landscape' })}`, { authorization: PEXELS })
  return (j?.photos || []).filter((p) => p.width >= 2400).map((p) => ({ bank: 'pexels', id: String(p.id), text: p.alt || '', width: p.width, height: p.height, author: p.photographer, page: p.url, full: p.src.original, thumb: p.src.medium, license: 'Licence Pexels', licenseUrl: 'https://www.pexels.com/fr-fr/license/' }))
}
async function pixabay(q) {
  if (!PIXABAY) return []
  const j = await getJson(`https://pixabay.com/api/?${new URLSearchParams({ key: PIXABAY, q, image_type: 'photo', orientation: 'horizontal', min_width: '2400', per_page: '30', safesearch: 'true' })}`)
  return (j?.hits || []).map((p) => ({ bank: 'pixabay', id: String(p.id), text: p.tags || '', width: p.imageWidth, height: p.imageHeight, author: p.user, page: p.pageURL, full: p.largeImageURL, thumb: p.webformatURL, license: 'Licence Pixabay', licenseUrl: 'https://pixabay.com/fr/service/license-summary/' }))
}
async function unsplash(q) {
  if (!UNSPLASH) return []
  const j = await getJson(`https://api.unsplash.com/search/photos?${new URLSearchParams({ query: q, per_page: '30', orientation: 'landscape', content_filter: 'high' })}`, { authorization: `Client-ID ${UNSPLASH}`, 'accept-version': 'v1' })
  return (j?.results || [])
    .filter((p) => !p.premium && !p.plus && p.width >= 2400)
    .map((p) => ({ bank: 'unsplash', id: p.id, text: [p.alt_description, p.description].filter(Boolean).join(' — '), width: p.width, height: p.height, author: p.user?.name, page: p.links.html, full: `${p.urls.raw}&w=2400&q=82&fm=jpg&fit=max`, thumb: p.urls.small, download: p.links.download_location, license: 'Licence Unsplash', licenseUrl: 'https://unsplash.com/fr/licence' }))
}

console.log('Banques actives :', [PEXELS && 'Pexels', PIXABAY && 'Pixabay', UNSPLASH && 'Unsplash'].filter(Boolean).join(', ') || 'aucune (clés absentes)')
const manifest = { fetchedAt: new Date().toISOString(), topics: {} }
for (const [topic, queries] of Object.entries(TOPICS)) {
  const seen = new Set()
  const found = []
  for (const q of queries) {
    for (const p of [...(await pexels(q)), ...(await pixabay(q)), ...(await unsplash(q))]) {
      const k = `${p.bank}:${p.id}`
      if (seen.has(k) || p.width / p.height < 1.3) continue
      seen.add(k)
      found.push({ ...p, query: q })
    }
    await sleep(800)
  }
  const dir = path.join(OUT, topic)
  mkdirSync(dir, { recursive: true })
  manifest.topics[topic] = []
  for (const [n, p] of found.slice(0, 24).entries()) {
    const res = await fetch(p.thumb, { headers: { 'user-agent': UA } }).catch(() => null)
    if (!res?.ok) continue
    const name = `${String(n + 1).padStart(2, '0')}-${p.bank}.jpg`
    writeFileSync(path.join(dir, name), Buffer.from(await res.arrayBuffer()))
    manifest.topics[topic].push({ name, ...p })
    await sleep(200)
  }
  console.log(topic, manifest.topics[topic].length)
}
writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1))
