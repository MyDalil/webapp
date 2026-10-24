/**
 * Catalogue des annonces (validé par Rad le 2026-10-21) : immobilier, emploi, véhicules, objets.
 * Une catégorie = ses sous-catégories et les caractéristiques demandées au dépôt.
 * Pur (sans base) : utilisé par la collection, les pages, le formulaire et les tests.
 */
export type Attr = 'deal' | 'rooms' | 'surface' | 'furnished' | 'contract' | 'sector' | 'brand' | 'model' | 'year' | 'mileage' | 'fuel' | 'gearbox' | 'condition'

export const CATEGORIES = [
  {
    value: 'immobilier',
    label: 'Immobilier',
    lead: 'Appartements, maisons, terrains et locaux, à vendre ou à louer.',
    subs: [
      ['appartement', 'Appartement'],
      ['maison', 'Maison et villa'],
      ['terrain', 'Terrain'],
      ['local', 'Local commercial et bureau'],
      ['chambre', 'Chambre et colocation'],
    ],
    attrs: ['deal', 'rooms', 'surface', 'furnished'] as Attr[],
    priceLabel: 'Prix',
  },
  {
    value: 'emploi',
    label: 'Emploi',
    lead: 'Offres d’emploi, recherches d’emploi, stages et missions.',
    subs: [
      ['offre', 'Offre d’emploi'],
      ['demande', 'Recherche d’emploi'],
      ['stage', 'Stage et alternance'],
      ['mission', 'Mission ponctuelle'],
    ],
    attrs: ['contract', 'sector'] as Attr[],
    priceLabel: 'Salaire mensuel',
  },
  {
    value: 'vehicules',
    label: 'Véhicules',
    lead: 'Voitures, motos, utilitaires, pièces et accessoires.',
    subs: [
      ['voiture', 'Voiture'],
      ['moto', 'Moto et scooter'],
      ['utilitaire', 'Utilitaire et camion'],
      ['pieces', 'Pièces et accessoires'],
    ],
    attrs: ['brand', 'model', 'year', 'mileage', 'fuel', 'gearbox', 'condition'] as Attr[],
    priceLabel: 'Prix',
  },
  {
    value: 'objets',
    label: 'Objets',
    lead: 'Maison, électroménager, téléphones, mode, enfants, sport.',
    subs: [
      ['maison', 'Maison et électroménager'],
      ['high-tech', 'Téléphones et informatique'],
      ['mode', 'Mode et vêtements'],
      ['enfants', 'Enfants et bébé'],
      ['sport', 'Sport et loisirs'],
      ['livres', 'Livres'],
      ['autres', 'Autres objets'],
    ],
    attrs: ['condition'] as Attr[],
    priceLabel: 'Prix',
  },
] as const

export type CategoryValue = (typeof CATEGORIES)[number]['value']

export const DEALS = [
  { value: 'vente', label: 'Vente' },
  { value: 'location', label: 'Location' },
  { value: 'location-vacances', label: 'Location de vacances' },
] as const
export const CONTRACTS = [
  { value: 'cdi', label: 'CDI' },
  { value: 'cdd', label: 'CDD' },
  { value: 'temps-partiel', label: 'Temps partiel' },
  { value: 'saisonnier', label: 'Saisonnier' },
  { value: 'independant', label: 'Indépendant' },
] as const
export const FUELS = [
  { value: 'essence', label: 'Essence' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'gpl', label: 'GPL' },
  { value: 'hybride', label: 'Hybride' },
  { value: 'electrique', label: 'Électrique' },
] as const
export const GEARBOXES = [
  { value: 'manuelle', label: 'Manuelle' },
  { value: 'automatique', label: 'Automatique' },
] as const
export const CONDITIONS = [
  { value: 'neuf', label: 'Neuf' },
  { value: 'tres-bon', label: 'Très bon état' },
  { value: 'bon', label: 'Bon état' },
  { value: 'pieces', label: 'Pour pièces' },
] as const
export const PRICE_MODES = [
  { value: 'fixed', label: 'Prix fixe' },
  { value: 'negotiable', label: 'Négociable' },
  { value: 'free', label: 'Gratuit (don)' },
  { value: 'on-request', label: 'Sur demande' },
] as const

export const STATUSES = [
  { value: 'pending', label: 'À contrôler' },
  { value: 'published', label: 'Publiée' },
  { value: 'rejected', label: 'Refusée' },
  { value: 'expired', label: 'Expirée' },
  { value: 'closed', label: 'Retirée par l’auteur' },
] as const
export type Status = (typeof STATUSES)[number]['value']

/** Avis d’un agent (Trust) sur une annonce à contrôler. L’agent propose, un humain publie. */
export const AGENT_VERDICTS = [
  { value: 'ok', label: 'Rien à signaler' },
  { value: 'doubt', label: 'À regarder de près' },
  { value: 'reject', label: 'Refus conseillé' },
] as const

/** Règles chiffrées (décision du 2026-10-21). */
export const RULES = {
  /** Durée d’une annonce publiée, en jours. */
  durationDays: 45,
  /** Avertissement avant expiration, en jours. */
  warnDays: 3,
  /** Renouvellement possible dans les derniers jours, ou après expiration. */
  renewWindowDays: 7,
  /** Annonces en cours (à contrôler + publiées) par compte. */
  maxActive: { particulier: 10, pro: 50 },
  maxPhotos: 8,
  titleMax: 90,
  descriptionMax: 4000,
} as const

export const category = (v: string | null | undefined) => CATEGORIES.find((c) => c.value === v) ?? null
export const categoryLabel = (v: string) => category(v)?.label ?? v
export const subLabel = (cat: string, sub: string) => (category(cat)?.subs.find(([v]) => v === sub)?.[1] as string | undefined) ?? sub
export const isSub = (cat: string, sub: string) => !!category(cat)?.subs.some(([v]) => v === sub)
/** Toutes les sous-catégories, préfixées par leur catégorie (valeur stockée : « categorie:sous »). */
export const ALL_SUBS = CATEGORIES.flatMap((c) => c.subs.map(([v, l]) => ({ value: `${c.value}:${v}`, label: `${c.label} — ${l}` })))

const labelOf = (list: readonly { value: string; label: string }[], v: string | null | undefined) => list.find((x) => x.value === v)?.label ?? null
export const dealLabel = (v?: string | null) => labelOf(DEALS, v)
export const contractLabel = (v?: string | null) => labelOf(CONTRACTS, v)
export const fuelLabel = (v?: string | null) => labelOf(FUELS, v)
export const gearboxLabel = (v?: string | null) => labelOf(GEARBOXES, v)
export const conditionLabel = (v?: string | null) => labelOf(CONDITIONS, v)
export const statusLabel = (v?: string | null) => labelOf(STATUSES, v) ?? v ?? ''

const money = (n: number) => `${new Intl.NumberFormat('fr-FR').format(Math.round(n))} DA`

/** Prix affiché. Emploi : salaire mensuel. */
export function priceLabel(a: { category: string; price?: number | null; priceMode?: string | null; deal?: string | null }) {
  if (a.priceMode === 'free') return 'Gratuit'
  if (a.priceMode === 'on-request' || a.price == null) return a.category === 'emploi' ? 'Salaire à discuter' : 'Prix sur demande'
  const base = money(a.price)
  const suffix = a.category === 'emploi' ? ' / mois' : a.deal === 'location' ? ' / mois' : a.deal === 'location-vacances' ? ' / nuit' : ''
  return `${base}${suffix}${a.priceMode === 'negotiable' ? ' · négociable' : ''}`
}

/** Caractéristiques lisibles d’une annonce, dans l’ordre du catalogue. */
export function facts(a: {
  category: string
  deal?: string | null
  rooms?: number | null
  surface?: number | null
  furnished?: boolean | null
  contract?: string | null
  sector?: string | null
  brand?: string | null
  model?: string | null
  year?: number | null
  mileage?: number | null
  fuel?: string | null
  gearbox?: string | null
  condition?: string | null
}): [string, string][] {
  const out: [string, string][] = []
  const push = (k: string, v: string | number | null | undefined) => v != null && v !== '' && out.push([k, String(v)])
  for (const attr of category(a.category)?.attrs ?? []) {
    if (attr === 'deal') push('Transaction', dealLabel(a.deal))
    if (attr === 'rooms') push('Pièces', a.rooms ? `F${a.rooms}` : null)
    if (attr === 'surface') push('Surface', a.surface ? `${a.surface} m²` : null)
    if (attr === 'furnished' && a.furnished) push('Meublé', 'Oui')
    if (attr === 'contract') push('Contrat', contractLabel(a.contract))
    if (attr === 'sector') push('Secteur', a.sector)
    if (attr === 'brand') push('Marque', a.brand)
    if (attr === 'model') push('Modèle', a.model)
    if (attr === 'year') push('Année', a.year)
    if (attr === 'mileage') push('Kilométrage', a.mileage != null ? `${new Intl.NumberFormat('fr-FR').format(a.mileage)} km` : null)
    if (attr === 'fuel') push('Énergie', fuelLabel(a.fuel))
    if (attr === 'gearbox') push('Boîte', gearboxLabel(a.gearbox))
    if (attr === 'condition') push('État', conditionLabel(a.condition))
  }
  return out
}

/** Numéros et emails masqués tant que l’auteur n’a pas répondu : les échanges restent dans DALIL. */
const PHONE = /(?:\+|00)?\d[\d\s.\-()]{7,}\d/g
const EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/gi
export const maskContacts = (s: string) => s.replace(EMAIL, '[coordonnées masquées]').replace(PHONE, (x) => (x.replace(/\D/g, '').length >= 8 ? '[coordonnées masquées]' : x))

const DAY = 86400e3
/** Date d’expiration à partir d’une date de publication. */
export const expiryFrom = (from: Date) => new Date(from.getTime() + RULES.durationDays * DAY)
/** Renouvellement permis : annonce expirée, ou publiée et dans ses derniers jours. */
export function canRenew(status: string, expiresAt: string | null | undefined, now = new Date()) {
  if (status === 'expired') return true
  if (status !== 'published' || !expiresAt) return false
  return Date.parse(expiresAt) - now.getTime() <= RULES.renewWindowDays * DAY
}
