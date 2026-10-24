// Prépare les fiches issues des recherches documentaires (sites officiels, annuaires ministériels) pour l’import.
// Entrée : un ou plusieurs fichiers JSON (tableaux) produits par les agents de recherche.
// Sortie : src/modules/annuaire/data/research-places.json — wilaya normalisée, horaires découpés, doublons fusionnés.
// Usage : node scripts/import/select-research.mjs fichier1.json fichier2.json …
import { readFileSync, writeFileSync } from 'node:fs'

const OUT = 'src/modules/annuaire/data/research-places.json'
const WILAYAS = ['Adrar', 'Chlef', 'Laghouat', 'Oum El Bouaghi', 'Batna', 'Béjaïa', 'Biskra', 'Béchar', 'Blida', 'Bouira', 'Tamanrasset', 'Tébessa', 'Tlemcen', 'Tiaret', 'Tizi Ouzou', 'Alger', 'Djelfa', 'Jijel', 'Sétif', 'Saïda', 'Skikda', 'Sidi Bel Abbès', 'Annaba', 'Guelma', 'Constantine', 'Médéa', 'Mostaganem', 'M’Sila', 'Mascara', 'Ouargla', 'Oran', 'El Bayadh', 'Illizi', 'Bordj Bou Arréridj', 'Boumerdès', 'El Tarf', 'Tindouf', 'Tissemsilt', 'El Oued', 'Khenchela', 'Souk Ahras', 'Tipaza', 'Mila', 'Aïn Defla', 'Naâma', 'Aïn Témouchent', 'Ghardaïa', 'Relizane', 'Timimoun', 'Bordj Badji Mokhtar', 'Ouled Djellal', 'Béni Abbès', 'In Salah', 'In Guezzam', 'Touggourt', 'Djanet', 'El M’Ghair', 'El Meniaa']
export const key = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’'`]/g, '').replace(/^(wilaya de |wilaya d)/, '').replace(/[^a-z0-9]+/g, ' ').trim()
const ALIAS = { algiers: 'Alger', 'el djazair': 'Alger', 'msila': 'M’Sila', 'el mghair': 'El M’Ghair', 'bordj bou arreridj': 'Bordj Bou Arréridj', 'tizi-ouzou': 'Tizi Ouzou', bejaia: 'Béjaïa', bougie: 'Béjaïa', 'el menia': 'El Meniaa', 'el menaa': 'El Meniaa', 'ain temouchent': 'Aïn Témouchent', 'ain defla': 'Aïn Defla', naama: 'Naâma' }
const BY_KEY = new Map(WILAYAS.map((w) => [key(w), w]))
export const wilaya = (w) => (w ? BY_KEY.get(key(w)) ?? ALIAS[key(w)] ?? null : null)

/** « Dim–Jeu 8h00–16h30 » → { days: 'Dim–Jeu', time: '8h00–16h30' } ; sinon un seul créneau « Horaires ». */
const hours = (h) => {
  if (!h) return []
  const parts = String(h).split(/\s*[;|]\s*/).filter(Boolean)
  const slots = parts.map((part) => /^([A-Za-zÀ-ÿ.–\- ,]{2,30}?)\s*:?\s+(\d{1,2}\s*h.*|fermé|24\s*h\/24)$/i.exec(part.trim()))
  // Découpe seulement si chaque morceau est un vrai créneau « jours heures » ; sinon le texte reste entier.
  return slots.every(Boolean) ? slots.map((m) => ({ days: m[1].trim(), time: m[2].trim() })) : [{ days: 'Horaires', time: String(h).trim().slice(0, 200) }]
}

const files = process.argv.slice(2)
const rows = files.flatMap((f) => JSON.parse(readFileSync(f, 'utf8')))
const out = new Map()
let dropped = 0
for (const r of rows) {
  const w = wilaya(r.wilaya)
  if (!r.name || !r.sector || !r.category || !r.sourceUrl) { dropped++; continue }
  const intro = [r.intro, r.practical].filter(Boolean).join(' ').trim()
  const rec = {
    id: `research:${key(r.name)}:${key(w ?? r.city ?? '')}`.replace(/\s+/g, '-'),
    name: r.name.trim(),
    nameAr: r.nameAr || null,
    sector: r.sector,
    category: r.category,
    wilaya: w,
    city: r.city || w || null,
    address: r.address || null,
    lat: typeof r.lat === 'number' ? r.lat : null,
    lng: typeof r.lng === 'number' ? r.lng : null,
    phone: r.phone || null,
    email: r.email || null,
    website: r.website || null,
    hours: hours(r.hours),
    intro: intro || null,
    inception: r.inception ? String(r.inception) : null,
    sourceUrl: r.sourceUrl,
    checkedAt: r.checkedAt || null,
    confidence: r.confidence || 'medium',
  }
  const prev = out.get(rec.id)
  out.set(rec.id, prev ? Object.fromEntries(Object.entries(rec).map(([k, v]) => [k, v ?? prev[k]])) : rec)
}
writeFileSync(OUT, JSON.stringify([...out.values()], null, 1))
const noWilaya = [...out.values()].filter((r) => !r.wilaya).map((r) => r.name)
console.log(`fiches ${out.size} · écartées ${dropped} · sans wilaya reconnue ${noWilaya.length}`, noWilaya.slice(0, 10))
