/**
 * Import CSV d’adresses : analyse, normalisation et détection des doublons (fonctions pures, testées).
 * Aucune donnée n’est inventée : une colonne absente reste vide, une ligne incomplète est refusée avec sa raison.
 */
import { SECTORS, WILAYA_ALIASES, WILAYAS } from '@/platform/referentiel/catalog'

/** Limite unique de taille d’un fichier CSV (route /api/ops/import-csv, action importer_csv, Telegram). */
export const MAX_CSV_BYTES = 1024 * 1024
export const MAX_CSV_LABEL = '1 Mo'
export const MAX_CSV_ROWS = 2000
/** Lignes traitées par requête : un lot tient largement dans la durée maximale d’une fonction. */
export const IMPORT_BATCH = 150
/** Demi-côté de la boîte géographique de recherche des doublons (~110 m), filtrée ensuite à NEAR_METERS. */
export const BOX_DEG = 0.001
/** Deux fiches à moins de 50 m l’une de l’autre sont un doublon probable. */
export const NEAR_METERS = 50

/** Analyse un CSV : BOM retiré, séparateur « ; » ou « , » détecté sur l’en-tête, guillemets (et "" échappés), retours à la ligne dans un champ. */
export function parseCsv(text: string): { headers: string[]; rows: string[][]; delimiter: ',' | ';' } {
  const src = text.replace(/^﻿/, '')
  const firstLine = src.split(/\r?\n/, 1)[0] ?? ''
  const count = (ch: string) => {
    let n = 0
    let q = false
    for (const c of firstLine) {
      if (c === '"') q = !q
      else if (!q && c === ch) n++
    }
    return n
  }
  const delimiter: ',' | ';' = count(';') > count(',') ? ';' : ','
  const out: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i++
        } else quoted = false
      } else field += c
      continue
    }
    if (c === '"' && field === '') quoted = true
    else if (c === delimiter) {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(field)
      field = ''
      if (row.some((v) => v.trim() !== '')) out.push(row)
      row = []
    } else field += c
  }
  row.push(field)
  if (row.some((v) => v.trim() !== '')) out.push(row)
  const [head = [], ...rows] = out
  return { headers: head.map((h) => h.trim()), rows: rows.map((r) => r.map((v) => v.trim())), delimiter }
}

/** Clé de comparaison : sans accents, minuscules, ponctuation retirée. */
export const normKey = (s?: string | null) =>
  String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’'`]/g, '').replace(/[^a-z0-9؀-ۿ]+/g, ' ').trim()

/** Téléphone au format international algérien (+213…). 0X XX XX XX XX, 00213…, +213 (0)… acceptés. Null si illisible. */
export function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null
  const s = String(raw).trim()
  let d = s.replace(/[^\d+]/g, '')
  if (!d) return null
  if (d.startsWith('00')) d = `+${d.slice(2)}`
  if (d.startsWith('+')) {
    const digits = d.slice(1).replace(/\D/g, '')
    if (digits.startsWith('213')) {
      const rest = digits.slice(3).replace(/^0/, '')
      return rest.length === 8 || rest.length === 9 ? `+213${rest}` : null
    }
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null
  }
  const digits = d.replace(/\D/g, '')
  if (digits.startsWith('213') && (digits.length === 11 || digits.length === 12)) return `+${digits}`
  const rest = digits.replace(/^0/, '')
  if (digits.startsWith('0') && (rest.length === 8 || rest.length === 9)) return `+213${rest}`
  return null
}

/** Distance en mètres entre deux points (formule de haversine). */
export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = Math.PI / 180
  const dLat = (b.lat - a.lat) * r
  const dLng = (b.lng - a.lng) * r
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2
  return 2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** En-têtes reconnus (sans accents, minuscules) → champ réel de la collection Places. */
const HEADER: Record<string, string> = {
  nom: 'name', name: 'name', 'nom arabe': 'nameAr', 'nom ar': 'nameAr', name_ar: 'nameAr', namear: 'nameAr', 'nom anglais': 'nameEn', nameen: 'nameEn',
  secteur: 'sector', sector: 'sector', rubrique: 'sector',
  categorie: 'category', category: 'category',
  wilaya: 'wilaya',
  ville: 'city', commune: 'city', city: 'city',
  quartier: 'place', repere: 'place', place: 'place',
  adresse: 'address', address: 'address', 'adresse complete': 'address',
  lat: 'lat', latitude: 'lat', lng: 'lng', lon: 'lng', long: 'lng', longitude: 'lng',
  telephone: 'phone', tel: 'phone', phone: 'phone', whatsapp: 'whatsapp', email: 'email', mail: 'email', courriel: 'email',
  site: 'website', 'site web': 'website', website: 'website', facebook: 'facebook', instagram: 'instagram',
  presentation: 'intro', description: 'intro', intro: 'intro',
  source: 'sourceUrl', 'lien source': 'sourceUrl', source_url: 'sourceUrl', sourceurl: 'sourceUrl',
}
const headerKey = (h: string) => normKey(h).replace(/_/g, ' ').trim()
export const mapHeader = (h: string): string | null => HEADER[headerKey(h)] ?? HEADER[normKey(h)] ?? null

/** Code officiel d’une wilaya à partir de son code ou de son nom (variantes comprises). */
export function wilayaCode(v?: string | null): string | null {
  if (!v) return null
  const t = v.trim()
  if (/^\d{1,2}$/.test(t)) return WILAYAS.some((w) => w.code === Number(t)) ? String(Number(t)) : null
  const w = WILAYAS.find((x) => normKey(x.name) === normKey(t) || (WILAYA_ALIASES[x.name] ?? []).some((a) => normKey(a) === normKey(t)))
  return w ? String(w.code) : null
}

const sectorSlug = (v?: string | null) => {
  if (!v) return null
  const k = normKey(v)
  return SECTORS.find((s) => s.slug === v.trim() || normKey(s.title) === k || normKey(s.slug) === k)?.slug ?? null
}

export type CsvPlace = {
  name: string
  sector: string
  category: string
  wilaya: string
  city: string
  nameAr?: string
  nameEn?: string
  place?: string
  address?: string
  lat?: number
  lng?: number
  phone?: string
  whatsapp?: string
  email?: string
  website?: string
  facebook?: string
  instagram?: string
  intro?: string
  sourceUrl?: string
}
export type CsvLine = { line: number; data?: CsvPlace; errors: string[] }

/** Transforme les lignes en fiches candidates ; chaque ligne garde son numéro (en-tête = ligne 1). */
export function toPlaces(parsed: { headers: string[]; rows: string[][] }, defaults: { wilaya?: string } = {}): { lines: CsvLine[]; unknownColumns: string[] } {
  const cols = parsed.headers.map(mapHeader)
  const unknownColumns = parsed.headers.filter((_, i) => !cols[i])
  const defWilaya = wilayaCode(defaults.wilaya)
  const lines = parsed.rows.map((r, i): CsvLine => {
    const raw: Record<string, string> = {}
    cols.forEach((c, j) => {
      if (c && r[j] !== undefined && r[j] !== '') raw[c] = r[j]
    })
    const errors: string[] = []
    const name = raw.name?.trim()
    const sector = sectorSlug(raw.sector)
    const wilaya = raw.wilaya ? wilayaCode(raw.wilaya) : defWilaya
    const city = raw.city?.trim()
    if (!name) errors.push('nom manquant')
    if (!raw.sector) errors.push('secteur manquant')
    else if (!sector) errors.push(`secteur inconnu « ${raw.sector} »`)
    if (!raw.category) errors.push('catégorie manquante')
    if (!wilaya) errors.push(raw.wilaya ? `wilaya inconnue « ${raw.wilaya} »` : 'wilaya manquante')
    if (!city) errors.push('ville ou commune manquante')
    const num = (v?: string) => (v === undefined ? undefined : Number(v.replace(',', '.')))
    const lat = num(raw.lat)
    const lng = num(raw.lng)
    if ((lat === undefined) !== (lng === undefined)) errors.push('coordonnées incomplètes')
    if (lat !== undefined && (!Number.isFinite(lat) || lat < 18 || lat > 38)) errors.push('latitude hors de l’Algérie')
    if (lng !== undefined && (!Number.isFinite(lng) || lng < -9 || lng > 12)) errors.push('longitude hors de l’Algérie')
    let phone: string | undefined
    if (raw.phone) {
      phone = normalizePhone(raw.phone) ?? undefined
      if (!phone) errors.push(`téléphone illisible « ${raw.phone} »`)
    }
    if (raw.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw.email)) errors.push(`email invalide « ${raw.email} »`)
    const site = (u?: string) => (u ? (/^https?:\/\//i.test(u) ? u : `https://${u}`) : undefined)
    if (errors.length) return { line: i + 2, errors }
    return {
      line: i + 2,
      errors,
      data: {
        name: name!, sector: sector!, category: raw.category!.trim(), wilaya: wilaya!, city: city!,
        nameAr: raw.nameAr, nameEn: raw.nameEn, place: raw.place, address: raw.address, lat, lng, phone,
        whatsapp: raw.whatsapp ? (normalizePhone(raw.whatsapp) ?? raw.whatsapp) : undefined,
        email: raw.email, website: site(raw.website), facebook: raw.facebook, instagram: raw.instagram, intro: raw.intro, sourceUrl: raw.sourceUrl,
      },
    }
  })
  return { lines, unknownColumns }
}

export type Known = { id: number | string; name: string; city?: string | null; phone?: string | null; lat?: number | null; lng?: number | null }
export type DupReason = 'téléphone' | 'nom et commune' | 'coordonnées'
export type Dup = { reason: DupReason; with: Known; distanceM?: number }

/** Index de recherche des doublons : téléphone normalisé, nom + commune, grille de ~110 m pour les coordonnées. */
export class DupIndex {
  private byPhone = new Map<string, Known>()
  private byName = new Map<string, Known>()
  private grid = new Map<string, Known[]>()
  private static cell = (lat: number, lng: number) => [Math.floor(lat * 1000), Math.floor(lng * 1000)] as const
  add(k: Known) {
    const p = normalizePhone(k.phone)
    if (p && !this.byPhone.has(p)) this.byPhone.set(p, k)
    const n = `${normKey(k.name)}|${normKey(k.city)}`
    if (!this.byName.has(n)) this.byName.set(n, k)
    if (k.lat != null && k.lng != null) {
      const [a, b] = DupIndex.cell(Number(k.lat), Number(k.lng))
      const key = `${a}:${b}`
      this.grid.set(key, [...(this.grid.get(key) ?? []), k])
    }
  }
  find(k: Omit<Known, 'id'> & { id?: Known['id'] }): Dup | null {
    const p = normalizePhone(k.phone)
    const hit = p ? this.byPhone.get(p) : undefined
    if (hit && hit.id !== k.id) return { reason: 'téléphone', with: hit }
    const n = this.byName.get(`${normKey(k.name)}|${normKey(k.city)}`)
    if (n && n.id !== k.id) return { reason: 'nom et commune', with: n }
    if (k.lat != null && k.lng != null) {
      const [a, b] = DupIndex.cell(Number(k.lat), Number(k.lng))
      for (let i = -1; i <= 1; i++)
        for (let j = -1; j <= 1; j++)
          for (const o of this.grid.get(`${a + i}:${b + j}`) ?? []) {
            if (o.id === k.id) continue
            const d = distanceM({ lat: Number(k.lat), lng: Number(k.lng) }, { lat: Number(o.lat), lng: Number(o.lng) })
            if (d < NEAR_METERS) return { reason: 'coordonnées', with: o, distanceM: Math.round(d) }
          }
    }
    return null
  }
}

export type ImportPlan = {
  toCreate: { line: number; data: CsvPlace }[]
  duplicates: { line: number; name: string; reason: DupReason; existing: { id: number | string; name: string; line?: number }; distanceM?: number }[]
  errors: { line: number; errors: string[] }[]
}

/** Plan d’import : doublons contre la base ET à l’intérieur du fichier. */
export function planImport(lines: CsvLine[], existing: Known[]): ImportPlan {
  const idx = new DupIndex()
  for (const k of existing) idx.add(k)
  return planWith(idx, lines)
}

function planWith(idx: DupIndex, lines: CsvLine[]): ImportPlan {
  const plan: ImportPlan = { toCreate: [], duplicates: [], errors: [] }
  for (const l of lines) {
    if (!l.data) {
      plan.errors.push({ line: l.line, errors: l.errors })
      continue
    }
    const d = idx.find(l.data)
    if (d) {
      const fromFile = typeof d.with.id === 'string' && d.with.id.startsWith('ligne-')
      plan.duplicates.push({ line: l.line, name: l.data.name, reason: d.reason, existing: { id: fromFile ? 0 : d.with.id, name: d.with.name, ...(fromFile ? { line: Number(String(d.with.id).slice(6)) } : {}) }, distanceM: d.distanceM })
      continue
    }
    idx.add({ id: `ligne-${l.line}`, name: l.data.name, city: l.data.city, phone: l.data.phone, lat: l.data.lat, lng: l.data.lng })
    plan.toCreate.push({ line: l.line, data: l.data })
  }
  return plan
}

/**
 * Plan d’un lot [debut, debut + taille) : doublons contre `existing` (fiches de la base proches du lot)
 * ET contre les lignes valides du fichier situées avant le lot (relance sûre, simulation comprise).
 * `suite` : indice de la première ligne du lot suivant, null à la fin du fichier.
 */
export function planBatch(lines: CsvLine[], debut: number, taille: number, existing: Known[]): ImportPlan & { debut: number; fin: number; suite: number | null } {
  const start = Math.max(0, Math.min(Math.floor(debut) || 0, lines.length))
  const end = Math.min(lines.length, start + Math.max(1, Math.floor(taille)))
  const idx = new DupIndex()
  for (const k of existing) idx.add(k)
  for (const l of lines.slice(0, start)) {
    if (l.data && !idx.find(l.data)) idx.add({ id: `ligne-${l.line}`, name: l.data.name, city: l.data.city, phone: l.data.phone, lat: l.data.lat, lng: l.data.lng })
  }
  const plan = planWith(idx, lines.slice(start, end))
  return { ...plan, debut: start, fin: end, suite: end < lines.length ? end : null }
}

/** Clés des requêtes ciblées de doublons pour un lot : fins de téléphone, nom + commune normalisés, boîtes ±BOX_DEG. */
export function dupKeys(places: CsvPlace[]) {
  const phones = new Set<string>()
  const names = new Set<string>()
  const boxes: { a: number; b: number; c: number; d: number }[] = []
  for (const p of places) {
    const n = normalizePhone(p.phone)
    if (n) phones.add(n.startsWith('+213') ? n.slice(4) : n.slice(1))
    const key = `${normKey(p.name)}|${normKey(p.city)}`
    if (key !== '|') names.add(key)
    if (p.lat != null && p.lng != null && Number.isFinite(p.lat) && Number.isFinite(p.lng)) boxes.push({ a: p.lat - BOX_DEG, b: p.lat + BOX_DEG, c: p.lng - BOX_DEG, d: p.lng + BOX_DEG })
  }
  return { phones: [...phones], names: [...names], boxes }
}

/** Paires de doublons probables dans une liste (contrôle de sécurité). */
export function duplicatePairs(items: Known[], max = 50) {
  const idx = new DupIndex()
  const out: { a: Known; b: Known; reason: DupReason; distanceM?: number }[] = []
  for (const k of items) {
    const d = idx.find(k)
    if (d && out.length < max) out.push({ a: d.with, b: k, reason: d.reason, distanceM: d.distanceM })
    idx.add(k)
  }
  return out
}
