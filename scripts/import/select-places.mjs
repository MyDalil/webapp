// Prépare le lot publiable à partir du jeu ouvert : uniquement les lieux qui ont
// une photo sous licence libre ET un texte DALIL rédigé (data/descriptions-*.json).
// Normalise noms, communes et wilayas, applique les corrections manuelles.
// Usage : node scripts/import/select-places.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'

const DIR = 'src/modules/annuaire/data'
const { places } = JSON.parse(readFileSync(`${DIR}/open-places.json`, 'utf8'))
const desc = Object.assign({}, ...readdirSync(DIR).filter((f) => /^descriptions-\d+\.json$/.test(f)).map((f) => JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8'))))
const catalog = readFileSync('src/platform/referentiel/catalog.ts', 'utf8')
const WILAYAS = JSON.parse(/export const WILAYAS[^=]*=\s*(\[.*\])/.exec(catalog)[1])

const NAME = {"Q7895015": "Université Ahmed Draïa d’Adrar", "Q115965411": "Mosquée Abdelhamid Ben Badis", "Q125084046": "Mosquée Errahma", "Q125085780": "Mosquée Larbi Tebessi", "Q141323831": "Thermes des Filadelfes", "Q137837191": "Mosquée Tarik ibn Ziyad", "Q115806070": "Faculté de technologie de Boumerdès", "Q130531375": "Mosquée Sayyida Khadija", "Q131462139": "Musée du Moudjahid de Mostaganem", "Q19830974": "Théâtre romain de Djemila", "Q129862554": "Marché antique de Djemila", "Q62050969": "Théâtre romain de Madaure", "Q2429753": "Théâtre romain de Khemissa", "Q7165602": "Musée de l’Armée de libération populaire", "Q129992260": "Théâtre romain de Tipasa", "Q124815719": "Mosquée Ibn Abi Zayd al-Qayrawani", "Q125020056": "Mosquée Abdelhamid Ben Badis", "Q131909870": "Mosquée Sidi El Ouzzane", "Q133464209": "Mosquée Sidi Abou Ishaq Et-Tayyar", "Q138717469": "Mosquée Mokra", "Q133464336": "Mausolée de Sidi Yacoub", "Q133464382": "Mausolée de Sidi Wahb", "Q130537285": "Plage de Mkhalled", "Q125491432": "Jardin d’El Hartoun", "Q817274": "Ksar de Beni Isguen", "Q1153491": "Mosquée Abdallah ben Salam", "Q64826792": "Mosquée Sidi Soufi"}

// Corrections vérifiées à la main (rattachement erroné dans Wikidata).
const FIX = {
  Q3331943: { wilaya: 'Oum El Bouaghi', city: 'Ouled Zouaï' },
  Q190048: { city: 'Djanet' },
  Q457362: { city: 'Djemila' },
  Q14629434: { city: 'Djanet' },
  Q3879490: { wilaya: 'Alger', city: 'Bologhine' },
  Q17490933: { wilaya: 'Alger', city: 'Alger' },
  Q21286443: { wilaya: 'Alger', city: 'El Mouradia' },
  Q59290081: { wilaya: 'Alger', city: 'Alger' },
  Q109312250: { wilaya: 'Alger', city: 'Casbah' },
  Q124774448: { wilaya: 'Alger', city: 'Mahelma' },
  Q63268078: { wilaya: 'Djanet', city: 'Djanet' },
  Q21656874: { wilaya: 'Bordj Bou Arréridj', city: 'Bibans' },
  Q122114787: { wilaya: 'Constantine', city: 'Constantine' },
}

const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '')
const wilayaCode = (name) => WILAYAS.find((w) => norm(w.name) === norm(name))?.code ?? null
const typo = (s) => s.replace(/'/g, '’').replace(/\s+/g, ' ').trim()
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const GENERIC = /^(wilaya|daïra|daira|algérie|maurétanie)/i

const seen = []
const out = []
for (const p of places) {
  if (!desc[p.id] || !p.photos?.length) continue
  const f = FIX[p.id] || {}
  const wilaya = f.wilaya || p.wilaya
  const code = wilayaCode(wilaya)
  if (!code) {
    console.warn('wilaya inconnue', p.id, wilaya)
    continue
  }
  const city = typo(f.city || (p.city && !GENERIC.test(p.city) ? p.city : wilaya))
  const name = NAME[p.id] || cap(typo(p.name))
  // Doublon : même nom normalisé à moins de 150 m.
  const dup = seen.find((s) => norm(s.name) === norm(name) && s.coord && p.coord && Math.hypot(s.coord.lat - p.coord.lat, s.coord.lng - p.coord.lng) < 0.0015)
  if (dup) continue
  const item = {
    id: p.id,
    sector: p.sector,
    category: p.category,
    name,
    nameAr: p.nameAr,
    nameEn: p.nameEn,
    intro: desc[p.id],
    wilaya: String(code),
    city,
    coord: p.coord,
    heritage: p.heritage.filter((h) => !/^https?:/.test(h)).map(cap).join(' ; ') || null,
    inception: p.inception && !p.inception.startsWith('-') ? String(+p.inception) : null,
    website: p.website,
    wikipedia: p.wikipedia,
    notoriety: p.notoriety,
    notes: p.notes,
    photos: p.photos.map(({ url, width, height, author, license, licenseUrl, page }) => ({ url, width, height, author, license, licenseUrl, page })),
  }
  seen.push(item)
  out.push(item)
}
writeFileSync(`${DIR}/open-places-selected.json`, JSON.stringify(out))
console.log('sélection', out.length, '/ textes', Object.keys(desc).length)
