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
import { PARTNER_LABEL, SPONSORED_LABEL, paidPlans, sponsoredFor } from '@/modules/pros'
import { PARTNER_TYPES, partnerFirst } from './partner'
import { nextFreeSlots, santeTaxonomyRows } from '@/modules/sante'
import { annuaireTaxonomyRows } from '@/modules/annuaire'
import { offSet } from '@/platform/controls/offSections'
import { hitOff } from '@/platform/controls/sections'

/** Groupe « sponsorise » : au plus 2 résultats payants, à part, en tête, chacun `sponsored: true` (jamais mêlés au classement). */
export type SearchGroup = { key: SearchType | 'pistes' | 'sponsorise'; title: string; hits: (SearchHit & { sponsored?: true; partenaire?: true; partnerLabel?: typeof PARTNER_LABEL })[] }
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
  const [found0, off] = await Promise.all([
    Promise.all(
    GROUPS.map((g) =>
      safe(querySearch(p, query, { types: g.types, wilaya: g.types.some((t) => CONTENT.includes(t)) ? place.wilaya : null, near: g.types.includes('adresse') ? place.near : null, limit: g.key === 'adresse' ? PAGE_SIZE : g.max * 3, offset: g.key === 'adresse' ? (page - 1) * PAGE_SIZE : 0 })),
    ),
    ),
    offSet(),
  ])
  // Rubriques et catégories coupées (/admin/rubriques) : aucun résultat ne mène vers elles.
  const keep = (h: SearchHit) => !hitOff(h, off)
  const lists = found0.map((l) => l.filter(keep))
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
    near = near.filter(keep)
    if (near.length) lists[i] = near.map((h) => ({ ...h, wilaya: place.wilaya ?? h.wilaya }))
  }
  // Wilaya choisie par le visiteur (en-tête) : ses adresses d’abord quand la recherche ne nomme aucun lieu.
  const home = place.wilaya ?? (opts.position ? null : opts.prefer ?? null)
  // « Partenaire » (plan payant) : à pertinence égale seulement, la fiche payante passe devant ; jamais « Vérifié » (règle 4).
  const partnerTargets = lists.flat().filter((h) => PARTNER_TYPES[h.type]).map((h) => ({ collection: PARTNER_TYPES[h.type]!, id: h.id }))
  const plans = await paidPlans(partnerTargets).catch(() => new Map<string, string>())
  const isPartner = (h: SearchHit) => Boolean(PARTNER_TYPES[h.type] && plans.has(`${PARTNER_TYPES[h.type]}:${h.id}`))
  const mark = (h: SearchHit): SearchGroup['hits'][number] => (isPartner(h) ? { ...h, partenaire: true as const, partnerLabel: PARTNER_LABEL } : h)
  const ranked: SearchGroup[] = GROUPS.map((g, i) => ({ key: g.key, title: g.title, hits: partnerFirst(lists[i].sort((a, b) => Number(b.wilaya === home) - Number(a.wilaya === home) || b.score - a.score), isPartner, (h) => `${Number(h.wilaya === home)}:${h.score}:${h.distanceKm ?? ''}`).slice(0, cat && place.near && g.key === 'adresse' ? 100 : g.max).map(localize).map(mark) }))
  // Mise en avant payante (1re page) : seulement des résultats déjà trouvés, retirés de leur groupe et montrés à part.
  const lifted = page === 1 ? await sponsoredFor(ranked.flatMap((g) => g.hits), { wilaya: place.wilaya }).catch(() => null) : null
  const liftedKeys = new Set((lifted?.sponsored ?? []).map((h) => `${h.type}:${h.id}`))
  const sponsoredGroup: SearchGroup[] = lifted?.sponsored.length ? [{ key: 'sponsorise', title: SPONSORED_LABEL.fr, hits: lifted.sponsored.map((h) => ({ ...h, badge: SPONSORED_LABEL.fr, sponsored: true as const })) }] : []
  const groups = [...sponsoredGroup, ...ranked.map((g) => ({ ...g, hits: g.hits.filter((h) => !liftedKeys.has(`${h.type}:${h.id}`)) }))].filter((g) => g.hits.length)
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

/** Mots qui précisent pour qui ou comment, sans nommer un lieu précis (« école pour les enfants »). */
const GENERIC = new Set(['pour', 'le', 'de', 'du', 'la', 'un', 'une', 'mon', 'ma', 'me', 'no', 'enfant', 'fille', 'fil', 'bebe', 'famille', 'bon', 'bonne', 'meilleur', 'meilleure', 'pa', 'cher', 'proche', 'pre', 'moi', 'ici', 'trouver', 'cherche', 'inscrire', 'inscription'])

/** Reste de phrase sans nom propre : la demande vise la catégorie, pas un lieu dont le nom contient ces mots. */
export const isGenericRest = (rest: string) => searchWords(rest).every((w) => GENERIC.has(w.replace(/[sx]$/, '')))

/**
 * Propositions pendant la frappe : catégories d’abord, puis contenus. 10 au plus.
 * « École pour les enfants » vise la catégorie : les adresses de la catégorie passent avant un nom qui contient « enfants ».
 * `prefer` : wilaya choisie dans l’en-tête ; ses contenus passent devant, sans écarter les autres.
 */
export async function suggest(q: string, prefer: string | null = null): Promise<{ items: SearchHit[]; place: string | null }> {
  const text = q.trim().slice(0, 80)
  if (searchWords(text).join('').length < 2) return { items: [], place: null }
  const place = detectPlace(text)
  const p = await payload()
  const query = place.rest || text
  const head = categoryPrefix(query)
  const contentQuery = head && isGenericRest(head.name) ? searchWords(query).slice(0, searchWords(query).length - searchWords(head.name).length).join(' ') : query
  const fail = async (e: unknown) => (await recordError(e, { route: '/api/recherche', routeType: 'recherche' }), [] as SearchHit[])
  const [cats0, content0, off] = await Promise.all([
    querySearch(p, query, { types: ['categorie', 'rubrique'], limit: 4 }).catch(fail),
    querySearch(p, contentQuery, { types: ['demarche', 'consulat', 'adresse', 'praticien', 'prestataire', 'annonce', 'guide'], wilaya: place.wilaya, near: place.near, limit: 16 }).catch(fail),
    offSet(),
  ])
  const cats = cats0.filter((h) => !hitOff(h, off))
  const content = content0.filter((h) => !hitOff(h, off))
  const home = place.wilaya ?? prefer
  const ranked = home ? [...content].sort((a, b) => Number(b.wilaya === home) - Number(a.wilaya === home) || b.score - a.score) : content
  // Groupes dans l’ordre de la maquette validée (Rad, 2026-11-19) : rendez-vous en ligne, adresses, puis le reste. 6 lignes au plus.
  const order = SUGGEST_ORDER
  const rows = ranked.slice(0, 6).sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type))
  // Praticiens : premier créneau libre (au plus 4 lectures d’agenda ; réponse gardée 5 min par le CDN).
  const slots = await nextFreeSlots(rows.filter((h) => h.type === 'praticien').map((h) => h.id)).catch(() => ({}) as Record<string, string>)
  const withSlots = rows.map((h) => (h.type === 'praticien' && slots[h.id] ? { ...h, slot: slots[h.id] } : h))
  const chips = withRelated(dedupeCategories(cats)).filter((h) => !hitOff(h, off)).slice(0, 4).map((h) => localizeHit(h, place.wilaya, place.label))
  return { items: [...chips, ...withSlots], place: place.wilaya ? place.label : null }
}

/** Pastilles voisines (maquette validée : « Médecins » → Pédiatres, Pharmacies, Hôpitaux). Sans voisins connus : autres catégories du même secteur. */
const RELATED: Record<string, string[]> = {
  'annuaire:sante-soins:medecins': ['sante:pediatrie', 'annuaire:sante-soins:pharmacies', 'annuaire:sante-soins:hopitaux'],
}
let TAXONOMY: SearchHit[] | null = null
const taxonomy = () => (TAXONOMY ??= [...annuaireTaxonomyRows(), ...santeTaxonomyRows()].map((r) => ({ ...r, score: 0 })))
export function withRelated(chips: SearchHit[]): SearchHit[] {
  const first = chips[0]
  if (!first || chips.length >= 4) return chips
  const all = taxonomy()
  const sector = first.id.startsWith('annuaire:') ? first.id.split(':').slice(0, 2).join(':') + ':' : null
  const ids = RELATED[first.id] ?? (sector ? all.filter((r) => r.type === 'categorie' && r.id.startsWith(sector)).map((r) => r.id) : [])
  const have = new Set(chips.map((c) => c.id))
  const extra = ids.filter((id) => !have.has(id)).map((id) => all.find((r) => r.id === id)).filter((r): r is SearchHit => Boolean(r))
  return dedupeCategories([...chips, ...extra])
}

const SUGGEST_ORDER: SearchType[] = ['praticien', 'adresse', 'prestataire', 'annonce', 'demarche', 'consulat', 'guide']

/** Une seule pastille par sujet : « Médecins » et « Médecin généraliste » ne s’affichent pas ensemble. */
export function dedupeCategories(hits: SearchHit[]): SearchHit[] {
  const seen = new Set<string>()
  return hits.filter((h) => {
    const k = (searchWords(h.title)[0] ?? h.title).replace(/aux$/, 'al').replace(/[sx]$/, '')
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

/** Catégorie trouvée avec un lieu : le lien ouvre directement la catégorie dans cette wilaya. */
export function localizeHit(h: SearchHit, wilaya: string | null, label: string | null): SearchHit {
  if (!wilaya || (h.type !== 'categorie' && h.type !== 'rubrique')) return h
  if (h.id.startsWith('annuaire:') && h.type === 'categorie') return { ...h, url: `${h.url}/${wilayaSlug(wilaya)}` }
  if (/^\/(praticiens|services|annonces)/.test(h.url)) return { ...h, url: `${h.url}${h.url.includes('?') ? '&' : '?'}wilaya=${wilaya}` }
  return h
}
