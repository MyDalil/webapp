import type { Payload } from 'payload'
import { GUIDES } from '../referentiel/catalog'
import { RUBRICS } from '../shell/nav'
import { replaceType, type SearchRow, type SearchType } from './store'

/** Rubriques du menu et guides : lignes du socle (sans métier). */
export function baseRows(): SearchRow[] {
  return [
    ...RUBRICS.flatMap((r) => [
      ...(r.href ? [{ type: 'rubrique' as const, id: `menu:${r.key}`, url: r.href, title: r.label, subtitle: 'Rubrique', text: r.entries.map((e) => `${e[2]} ${e[3]}`).join(' '), boost: 0.7 }] : []),
      ...r.entries.map(([href, , title, sub]) => ({ type: 'rubrique' as const, id: `menu:${r.key}:${href}`, url: href, title, subtitle: `${r.label} · ${sub}`, text: sub, boost: 0.6 })),
    ]),
    ...GUIDES.map((g) => ({ type: 'guide' as const, id: g.slug, url: `/guides/${g.slug}`, title: g.title, subtitle: `Guide · ${g.category}`, text: [g.summary, ...g.keywords, ...g.steps].join(' '), boost: 0.4 })),
  ]
}

/**
 * Reconstruction complète de l’index : lignes fixes (rubriques, catégories, guides) puis contenus de chaque métier.
 * Appelée après chaque déploiement (`pnpm search:index`) et chaque jour (`/api/taches`).
 */
export async function rebuildIndex(payload: Payload, fixed: SearchRow[], loaders: Record<string, (p: Payload) => Promise<number>>) {
  const rows = [...baseRows(), ...fixed]
  const seen = new Map<string, SearchRow>()
  for (const r of rows) seen.set(`${r.type}:${r.id}`, r)
  const byType = new Map<SearchType, SearchRow[]>()
  for (const r of seen.values()) byType.set(r.type, [...(byType.get(r.type) ?? []), r])
  const counts: Record<string, number> = {}
  for (const t of ['rubrique', 'categorie', 'guide'] as SearchType[]) {
    const list = byType.get(t) ?? []
    await replaceType(payload, t, list)
    counts[t] = list.length
  }
  for (const [name, load] of Object.entries(loaders)) counts[name] = await load(payload)
  return counts
}
