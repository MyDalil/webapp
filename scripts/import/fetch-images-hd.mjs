// Photos HD remarquables (Wikimedia Commons, licences libres) par catégorie Commons : candidats 1920 px, choix final à la main.
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const UA = 'DALIL/1.0 (https://www.mydalil.com; salam@mydalil.com)'
const OUT = 'data/images-hd'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const CATS = {
  // Vie musulmane (2026-10-30) : photos des sujets encore sans image.
  coran: ['Quranic schools', 'Kuttab', 'Children reading the Quran', 'Mushaf', 'Quran stands', 'People reading the Quran'],
  librairie: ['Bookshops in Algeria', 'Islamic bookshops', 'Bookstores in Algiers', 'Salon international du livre d\'Alger', 'Bookshops in Morocco', 'Arabic books'],
  entraide: ['Iftar', 'Ramadan in Algeria', 'Mass iftar', 'Charity in Islam', 'Zakat'],
  funerailles: ['Cemeteries in Algeria', 'El Alia Cemetery', 'Muslim cemeteries', 'Islamic funerals', 'Cemeteries in Algiers'],
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
      if (!ii || seen.has(pg.title) || !/image\/(jpeg|png|webp)/.test(ii.mime) || ii.width < 1200) continue
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
