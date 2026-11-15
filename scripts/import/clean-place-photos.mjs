// Nettoyage des photos collectées (contrôle visuel du 2026-11-15 : 8 photos fausses sur 16). Hors ligne.
// Cause 1 — une même image pour plusieurs lieux : l’étiquette wikidata d’OpenStreetMap pointe vers la marque
//   (ex. Algérie Poste → photo de la Grande Poste pour chaque bureau de poste). Image partagée = retirée partout.
// Cause 2 — recherche géographique sur un nom de ville (« DRARIA », « Mairie d’El Alia ») : le titre du fichier cite la
//   ville, pas le lieu. On n’accepte que les mots qui ne sont ni génériques ni un nom de commune.
// Aussi : postes et mairies sans vrai nom propre → photo d’illustration de la catégorie plutôt qu’une photo douteuse.
import { readFileSync, writeFileSync } from 'node:fs'

const FILE = 'src/modules/annuaire/data/place-photos.json'
const DATA = 'src/modules/annuaire/data'
const data = JSON.parse(readFileSync(FILE, 'utf8'))
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

const records = new Map()
for (const f of ['osm-selected', 'osm-mosques-selected', 'overture-selected', 'research-places', 'open-places-selected', 'public-bodies'])
  for (const r of JSON.parse(readFileSync(`${DATA}/${f}.json`, 'utf8'))) records.set(r.id, r)

const COMMUNES = new Set()
for (const c of JSON.parse(readFileSync('src/platform/referentiel/communes.json', 'utf8'))) for (const t of norm(c.name).split(' ')) if (t.length >= 4) COMMUNES.add(t)
const GENERIC = new Set(
  ('ecole primaire moyenne lycee college coranique mosquee masjid mesdjid djamaa jamaa jamia jami zaouia hopital clinique centre sante polyclinique salle soins mairie daira wilaya siege bureau poste agence direction gare station routiere ferroviaire universite faculte institut superieure national nationale public publique rue cite des nouvelle nouveau ancienne ancien grand grande petit petite sidi lalla cheikh imam musee parc jardin plage place stade complexe sportif maternelle creche formation professionnelle annexe residence universitaire aeroport militaire international view vue panorama street road avenue boulevard city town ville village algeria algerie').split(' '),
)
const strong = (name) => norm(name).split(' ').filter((t) => t.length >= 4 && !GENERIC.has(t) && !COMMUNES.has(t) && !/^\d+$/.test(t))
const title = (p) => norm(decodeURIComponent(String(p.page || p.url).split(/File:|\//).pop() || '').replace(/\.[a-z]+$/i, ''))

// Une image partagée est gardée seulement si tous ses lieux sont le même lieu vu par deux sources (à moins de 300 m).
const holders = new Map()
for (const [id, list] of Object.entries(data.photos)) for (const p of list) holders.set(p.url, [...(holders.get(p.url) || []), id])
const near = (a, b) => a && b && a.lat != null && b.lat != null && Math.hypot((a.lat - b.lat) * 111000, (a.lng - b.lng) * 111000 * Math.cos((a.lat * Math.PI) / 180)) < 300
const sharedBad = (url) => {
  const ids = holders.get(url) || []
  return ids.length > 1 && !ids.every((x) => near(records.get(x), records.get(ids[0])))
}
// Postes et mairies portent le nom de la ville : une photo trouvée par la carte montre la ville, pas le bâtiment.
const TOWN_NAMED = new Set(['Bureaux de poste', 'Services municipaux'])

const stats = { shared: 0, weakGeo: 0, unknown: 0, kept: 0 }
const kept = {}
for (const [id, list] of Object.entries(data.photos)) {
  const r = records.get(id)
  if (!r) {
    stats.unknown++
    continue
  }
  const ok = list.filter((p) => {
    if (sharedBad(p.url)) return (stats.shared++, false)
    if (p.via === 'geo' && TOWN_NAMED.has(r.category)) return (stats.weakGeo++, false)
    if (p.via === 'geo') {
      const words = strong(r.name)
      if (!words.length || !words.some((w) => title(p).split(' ').includes(w))) return (stats.weakGeo++, false)
    }
    return true
  })
  if (ok.length) {
    kept[id] = ok
    stats.kept++
  }
}
data.photos = kept
data.cleanedAt = new Date().toISOString()
writeFileSync(FILE, JSON.stringify(data))
console.log(JSON.stringify(stats))
