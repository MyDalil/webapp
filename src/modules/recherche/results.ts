import 'server-only'
import { payload } from '@/platform/http'
import { querySearch, searchWords, type SearchHit, type SearchType } from '@/platform/search/store'
import { detectPlace } from './place'
import { wilayaSlug } from '@/platform/referentiel/slug'
import { localIntent, type Intent } from './intent'

export type SearchGroup = { key: SearchType | 'pistes'; title: string; hits: SearchHit[] }
export type SearchResults = { intent: Intent; place: string | null; total: number; groups: SearchGroup[] }

const GROUPS: { key: SearchGroup['key']; title: string; types: SearchType[]; max: number }[] = [
  { key: 'pistes', title: 'Rubriques et catégories', types: ['categorie', 'rubrique'], max: 8 },
  { key: 'praticien', title: 'Praticiens — rendez-vous en ligne', types: ['praticien'], max: 6 },
  { key: 'prestataire', title: 'Prestataires', types: ['prestataire'], max: 6 },
  { key: 'adresse', title: 'Adresses', types: ['adresse'], max: 12 },
  { key: 'annonce', title: 'Annonces', types: ['annonce'], max: 8 },
  { key: 'guide', title: 'Guides', types: ['guide'], max: 4 },
]

/**
 * Recherche complète (barre de l’accueil → /recherche) dans l’index commun : rubriques, catégories et sous-catégories,
 * adresses, praticiens, prestataires, annonces, guides. Sans accent, fautes tolérées, lieu reconnu dans la phrase.
 */
export async function searchEverything(q: string): Promise<SearchResults> {
  const text = q.trim().slice(0, 200)
  const place = detectPlace(text)
  const intent = localIntent(text)
  const p = await payload()
  const query = place.rest || text
  // Une requête par groupe : les catégories ne sont jamais noyées sous des milliers d’adresses du même nom.
  const CONTENT: SearchType[] = ['adresse', 'praticien', 'prestataire', 'annonce']
  const lists = await Promise.all(
    GROUPS.map((g) =>
      querySearch(p, query, { types: g.types, wilaya: g.types.some((t) => CONTENT.includes(t)) ? place.wilaya : null, limit: g.max * 3 }).catch(() => [] as SearchHit[]),
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
  const groups = GROUPS.map((g, i) => ({ key: g.key, title: g.title, hits: lists[i].sort((a, b) => Number(b.wilaya === place.wilaya) - Number(a.wilaya === place.wilaya) || b.score - a.score).slice(0, g.max).map(localize) })).filter((g) => g.hits.length)
  return { intent, place: place.label, total: groups.reduce((n, g) => n + g.hits.length, 0), groups }
}

/** Propositions pendant la frappe : catégories d’abord, puis contenus. 8 au plus. */
export async function suggest(q: string): Promise<SearchHit[]> {
  const text = q.trim().slice(0, 80)
  if (searchWords(text).join('').length < 2) return []
  const place = detectPlace(text)
  const p = await payload()
  const query = place.rest || text
  const [cats, content] = await Promise.all([
    querySearch(p, query, { types: ['categorie', 'rubrique'], limit: 4 }).catch(() => [] as SearchHit[]),
    querySearch(p, query, { types: ['adresse', 'praticien', 'prestataire', 'annonce', 'guide'], wilaya: place.wilaya, limit: 6 }).catch(() => [] as SearchHit[]),
  ])
  return [...cats, ...content].slice(0, 8)
}
