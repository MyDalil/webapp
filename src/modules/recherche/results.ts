import { recordMiss } from './misses'
import 'server-only'
import { payload } from '@/platform/http'
import { countSearch, nearestByCategory, querySearch, searchWords, type SearchHit, type SearchType } from '@/platform/search/store'
import { recordError } from '@/platform/monitoring/errors'
import { detectPlace } from './place'
import { categoryOf, categoryPrefix, nameMatch } from './category'
import { wilayaSlug } from '@/platform/referentiel/slug'
import { WILAYAS } from '@/platform/referentiel/catalog'
import { localIntent, type Intent } from './intent'

export type SearchGroup = { key: SearchType | 'pistes'; title: string; hits: SearchHit[] }
/** `nearby` : le lieu est une commune ou un quartier (adresses classées par proximité). */
/** `spread` : sans lieu précisé, adresses trouvées dans plusieurs wilayas (homonymes) — pour aider à préciser. */
/**
 * `unavailable` : une requête a échoué (base ou index) — jamais présenté comme « aucun résultat » (audit A09).
 * `addresses` : total exact des adresses correspondantes, nombre affiché, page (audit A10).
 * `professional` : la demande parle d’exercer un métier, pas de trouver un professionnel (audit D02).
 */
export type SearchResults = { intent: Intent; place: string | null; nearby: boolean; total: number; groups: SearchGroup[]; spread: { wilaya: string; name: string; count: number }[] | null; unavailable: boolean; addresses: { total: number; shown: number; page: number; pages: number }; professional: boolean }

/** Projet professionnel (« je suis dentiste et je veux exercer à Alger ») : parcours d’accompagnement, pas un annuaire. */
const PROFESSIONAL = /\b(je suis|j['’]exerce|exercer|m['’]installer comme|ouvrir (un|mon) (cabinet|commerce|entreprise)|cr[ée]er (une|mon) (entreprise|activit)|dipl[oô]me|[ée]quivalence|autorisation d['’]exercer|statut d['’]auto)/i
export const isProfessionalProject = (q: string) => PROFESSIONAL.test(q)

const PAGE_SIZE = 12

const GROUPS: { key: SearchGroup['key']; title: string; types: SearchType[]; max: number }[] = [
  { key: 'pistes', title: 'Rubriques et catégories', types: ['categorie', 'rubrique'], max: 8 },
  { key: 'praticien', title: 'Praticiens — rendez-vous en ligne', types: ['praticien'], max: 6 },
  { key: 'prestataire', title: 'Prestataires', types: ['prestataire'], max: 6 },
  { key: 'adresse', title: 'Adresses', types: ['adresse'], max: 12 },
  { key: 'annonce', title: 'Annonces', types: ['annonce'], max: 8 },
  { key: 'demarche', title: 'Démarches officielles', types: ['demarche'], max: 6 },
  { key: 'consulat', title: 'Ambassades et consulats', types: ['consulat'], max: 6 },
  { key: 'guide', title: 'Guides', types: ['guide'], max: 4 },
]

/**
 * Recherche complète (barre de l’accueil → /recherche) dans l’index commun : rubriques, catégories et sous-catégories,
 * adresses, praticiens, prestataires, annonces, guides. Sans accent, fautes tolérées, lieu reconnu dans la phrase.
 */
export async function searchEverything(q: string, opts: { position?: { lat: number; lng: number } | null; prefer?: string | null; page?: number } = {}): Promise<SearchResults> {
  const text = q.trim().slice(0, 200)
  let unavailable = false
  const safe = <T,>(p: Promise<T[]>): Promise<T[]> =>
    p.catch(async (e) => {
      unavailable = true
      await recordError(e, { route: '/recherche', routeType: 'recherche' })
      return [] as T[]
    })
  const page = Math.max(1, Math.min(50, Math.floor(opts.page ?? 1)))
  const found = detectPlace(text)
  // Position de l’utilisateur (« Autour de moi ») : elle remplace le lieu écrit pour le classement par proximité.
  const place = opts.position ? { ...found, near: opts.position, label: found.label } : found
  // « mosquée Draria » : catégorie seule ; « mosquée Bachir Ibrahimi Draria » : catégorie + nom (les plus ressemblantes d’abord).
  const prefix = place.near ? categoryPrefix(place.rest || text) : null
  const cat = place.near ? categoryOf(place.rest || text) ?? prefix : null
  const wanted = cat && prefix && prefix.category === cat.category ? prefix.name : ''
  const intent = localIntent(text)
  const p = await payload()
  const query = place.rest || text
  // Une requête par groupe : les catégories ne sont jamais noyées sous des milliers d’adresses du même nom.
  const CONTENT: SearchType[] = ['adresse', 'praticien', 'prestataire', 'annonce']
  const lists = await Promise.all(
    GROUPS.map((g) =>
      safe(querySearch(p, query, { types: g.types, wilaya: g.types.some((t) => CONTENT.includes(t)) ? place.wilaya : null, near: g.types.includes('adresse') ? place.near : null, limit: g.key === 'adresse' ? PAGE_SIZE : g.max * 3, offset: g.key === 'adresse' ? (page - 1) * PAGE_SIZE : 0 })),
    ),
  )
  // Une catégorie trouvée avec un lieu ouvre directement « catégorie × wilaya ».
  const localize = (h: SearchHit): SearchHit => {
    if (!place.wilaya || (h.type !== 'categorie' && h.type !== 'rubrique')) return h
    if (h.id.startsWith('annuaire:') && h.type === 'categorie') return { ...h, url: `${h.url}/${wilayaSlug(place.wilaya)}`, subtitle: `${h.subtitle} · ${place.label}` }
    if (/^\/(praticiens|services|annonces)/.test(h.url)) return { ...h, url: `${h.url}${h.url.includes('?') ? '&' : '?'}wilaya=${place.wilaya}`, subtitle: `${h.subtitle} · ${place.label}` }
    return h
  }
  // Avec un lieu : contenus de la wilaya d’abord (les contenus nationaux restent après).
  // Catégorie + lieu (« mosquée Draria », « pharmacie » autour de moi) : toutes les adresses du rayon, de la plus proche.
  if (cat && place.near) {
    const around = (radiusKm: number) => safe(nearestByCategory(p, { category: cat.category, lat: place.near!.lat, lng: place.near!.lng, radiusKm, city: opts.position ? null : place.label, limit: 100 }))
    // Peu de résultats : rayon élargi (zones moins denses).
    let near = await around(opts.position ? 3 : 5)
    if (near.length < 8) near = await around(15)
    const i = GROUPS.findIndex((g) => g.key === 'adresse')
    if (wanted) {
      const score = new Map(near.map((h) => [h.id, nameMatch(wanted, h.title)]))
      near = [...near].sort((a, b) => Number((score.get(b.id) ?? 0) >= 0.3) - Number((score.get(a.id) ?? 0) >= 0.3) || (a.distanceKm ?? 99) - (b.distanceKm ?? 99))
    }
    if (near.length) lists[i] = near.map((h) => ({ ...h, wilaya: place.wilaya ?? h.wilaya }))
  }
  // Wilaya choisie par le visiteur (en-tête) : ses adresses d’abord quand la recherche ne nomme aucun lieu.
  const home = place.wilaya ?? (opts.position ? null : opts.prefer ?? null)
  const groups = GROUPS.map((g, i) => ({ key: g.key, title: g.title, hits: lists[i].sort((a, b) => Number(b.wilaya === home) - Number(a.wilaya === home) || b.score - a.score).slice(0, cat && place.near && g.key === 'adresse' ? 100 : g.max).map(localize) })).filter((g) => g.hits.length)
  // Homonymes (« Mosquée Bachir El Ibrahimi » : une trentaine en Algérie) : wilayas où il y en a, pour préciser en un geste.
  let spread: SearchResults['spread'] = null
  if (!place.wilaya && !opts.position) {
    const all = await safe(querySearch(p, query, { types: ['adresse'], limit: 200 }))
    const by = new Map<string, number>()
    for (const h of all) if (h.wilaya) by.set(h.wilaya, (by.get(h.wilaya) ?? 0) + 1)
    if (by.size >= 3 && all.length >= 6)
      spread = [...by.entries()]
        .map(([wilaya, count]) => ({ wilaya, count, name: WILAYAS.find((w) => String(w.code) === wilaya)?.name ?? wilaya }))
        .sort((a, b) => Number(b.wilaya === home) - Number(a.wilaya === home) || b.count - a.count)
        .slice(0, 12)
  }
  // Total exact des adresses (et non la taille de la liste affichée). Recherche par proximité : toutes celles du rayon.
  const nearMode = Boolean(cat && place.near)
  const shownAddresses = groups.find((g) => g.key === 'adresse')?.hits.length ?? 0
  const addressTotal = nearMode ? lists[GROUPS.findIndex((g) => g.key === 'adresse')].length : await countSearch(p, query, { types: ['adresse'], wilaya: place.wilaya }).catch(async (e) => {
    unavailable = true
    await recordError(e, { route: '/recherche', routeType: 'recherche' })
    return shownAddresses
  })
  const addresses = { total: addressTotal, shown: shownAddresses, page: nearMode ? 1 : page, pages: nearMode ? 1 : Math.max(1, Math.ceil(addressTotal / PAGE_SIZE)) }
  const total = groups.reduce((n, g) => n + g.hits.length, 0)
  // Recherche sans résultat (1re page, index disponible) : notée pour le cockpit (texte seul, jamais d’email ni de numéro).
  if (total === 0 && page === 1 && !unavailable) await recordMiss(p, text).catch(() => false)
  return { intent, place: opts.position ? 'vous' : place.label, nearby: Boolean(place.near), total, groups, spread, unavailable, addresses, professional: isProfessionalProject(text) }
}

/** Propositions pendant la frappe : catégories d’abord, puis contenus. 8 au plus. */
export async function suggest(q: string): Promise<SearchHit[]> {
  const text = q.trim().slice(0, 80)
  if (searchWords(text).join('').length < 2) return []
  const place = detectPlace(text)
  const p = await payload()
  const query = place.rest || text
  const [cats, content] = await Promise.all([
    querySearch(p, query, { types: ['categorie', 'rubrique'], limit: 4 }).catch(async (e) => (await recordError(e, { route: '/api/recherche', routeType: 'recherche' }), [] as SearchHit[])),
    querySearch(p, query, { types: ['demarche', 'consulat', 'adresse', 'praticien', 'prestataire', 'annonce', 'guide'], wilaya: place.wilaya, near: place.near, limit: 8 }).catch(async (e) => (await recordError(e, { route: '/api/recherche', routeType: 'recherche' }), [] as SearchHit[])),
  ])
  return [...cats, ...content].slice(0, 10)
}
