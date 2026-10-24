import { CONDITIONS, CONTRACTS, DEALS, FUELS, GEARBOXES, PRICE_MODES, RULES, category, isSub } from './referentiel'

/** Données d’une annonce envoyées par son auteur (formulaire de dépôt ou de modification). */
export type ClassifiedInput = {
  title: string
  category: string
  subcategory: string
  description: string
  price: number | null
  priceMode: string
  wilaya: string
  commune: string | null
  deal: string | null
  rooms: number | null
  surface: number | null
  furnished: boolean
  contract: string | null
  sector: string | null
  brand: string | null
  model: string | null
  year: number | null
  mileage: number | null
  fuel: string | null
  gearbox: string | null
  condition: string | null
}

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '')
const longText = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, max) : '')
const num = (v: unknown) => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(String(v).replace(/[\s ]/g, '').replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : NaN
}
const pick = (list: readonly { value: string }[], v: unknown) => (typeof v === 'string' && list.some((x) => x.value === v) ? v : null)

/**
 * Contrôle et nettoie une annonce. Pur et testé (`validate.test.ts`).
 * `communeOk` vérifie qu’une commune appartient à la wilaya (référentiel des communes).
 */
export function parseClassified(raw: Record<string, unknown>, communeOk: (commune: string, wilaya: string) => boolean): ClassifiedInput | { error: string } {
  const cat = category(String(raw.category ?? ''))
  if (!cat) return { error: 'Choisissez une catégorie.' }
  const sub = String(raw.subcategory ?? '').replace(`${cat.value}:`, '')
  if (!isSub(cat.value, sub)) return { error: 'Choisissez le type d’annonce.' }
  const title = text(raw.title, RULES.titleMax)
  if (title.length < 5) return { error: 'Titre trop court (5 caractères minimum).' }
  const description = longText(raw.description, RULES.descriptionMax)
  if (description.length < 20) return { error: 'Description trop courte (20 caractères minimum).' }
  const priceMode = pick(PRICE_MODES, raw.priceMode) ?? 'fixed'
  const price = num(raw.price)
  if (Number.isNaN(price)) return { error: 'Prix invalide : chiffres uniquement, en dinars.' }
  if ((priceMode === 'fixed' || priceMode === 'negotiable') && price === null && cat.value !== 'emploi') return { error: 'Indiquez un prix, ou choisissez « Sur demande » ou « Gratuit ».' }
  const wilaya = String(raw.wilaya ?? '')
  if (!/^\d{1,2}$/.test(wilaya)) return { error: 'Choisissez une wilaya.' }
  const commune = text(raw.commune, 60) || null
  if (commune && !communeOk(commune, wilaya)) return { error: 'La commune ne fait pas partie de cette wilaya.' }

  const has = (a: string) => (cat.attrs as readonly string[]).includes(a)
  const n = (k: string) => (has(k) ? num(raw[k]) : null)
  const rooms = n('rooms')
  const surface = n('surface')
  const year = n('year')
  const mileage = n('mileage')
  for (const [k, v] of [['Pièces', rooms], ['Surface', surface], ['Année', year], ['Kilométrage', mileage]] as const) if (Number.isNaN(v)) return { error: `${k} : chiffres uniquement.` }
  if (year !== null && (year < 1950 || year > new Date().getFullYear() + 1)) return { error: 'Année invalide.' }
  const deal = has('deal') ? pick(DEALS, raw.deal) : null
  if (has('deal') && !deal) return { error: 'Précisez : vente, location ou location de vacances.' }

  return {
    title,
    category: cat.value,
    subcategory: `${cat.value}:${sub}`,
    description,
    price: priceMode === 'free' ? 0 : priceMode === 'on-request' ? null : price,
    priceMode,
    wilaya: String(Number(wilaya)),
    commune,
    deal,
    rooms: rooms === null ? null : Math.round(rooms),
    surface: surface === null ? null : Math.round(surface),
    furnished: has('furnished') && (raw.furnished === true || raw.furnished === 'true' || raw.furnished === 'on'),
    contract: has('contract') ? pick(CONTRACTS, raw.contract) : null,
    sector: has('sector') ? text(raw.sector, 80) || null : null,
    brand: has('brand') ? text(raw.brand, 40) || null : null,
    model: has('model') ? text(raw.model, 60) || null : null,
    year: year === null ? null : Math.round(year),
    mileage: mileage === null ? null : Math.round(mileage),
    fuel: has('fuel') ? pick(FUELS, raw.fuel) : null,
    gearbox: has('gearbox') ? pick(GEARBOXES, raw.gearbox) : null,
    condition: has('condition') ? pick(CONDITIONS, raw.condition) : null,
  }
}
