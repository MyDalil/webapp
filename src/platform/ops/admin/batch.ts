/**
 * Import CSV par lots (logique pure, testée) : l’API traite 150 lignes par appel et renvoie `suite`
 * tant qu’il reste des lignes. La vue renvoie `suite` telle quelle (curseur opaque) jusqu’à ce qu’elle soit absente,
 * cumule les rapports et calcule la progression.
 */
export type Report = {
  mode: 'simulation' | 'confirme'
  lignes: number
  colonnesIgnorees: string[]
  aCreer: { line: number; name: string; city: string; category: string }[]
  doublons: { line: number; name: string; reason: string; existing: { id: number | string; name: string; line?: number }; distanceM?: number }[]
  erreurs: { line: number; errors: string[] }[]
  crees?: { line: number; id: number | string; name: string }[]
  echecs?: { line: number; erreur: string }[]
  suite?: unknown
}

export const BATCH_SIZE = 150
/** Garde-fou : jamais plus d’appels que nécessaire pour le fichier (1 Mo au plus), même si l’API renvoyait toujours `suite`. */
export const maxCalls = (rows: number) => Math.ceil(Math.max(rows, 1) / BATCH_SIZE) + 2

/** Lignes de données d’un CSV (hors en-tête et lignes vides), guillemets multilignes compris. */
export function csvDataRows(csv: string): number {
  let rows = 0
  let inQuote = false
  let filled = false
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i]
    if (c === '"') inQuote = !inQuote
    if (!inQuote && (c === '\n' || c === '\r')) {
      if (filled) rows++
      filled = false
      if (c === '\r' && csv[i + 1] === '\n') i++
    } else if (c.trim()) filled = true
  }
  if (filled) rows++
  return Math.max(rows - 1, 0)
}

/** `suite` présente = il reste des lignes. */
export const hasMore = (suite: unknown) => suite !== undefined && suite !== null && suite !== false && suite !== ''

/** Progression : position donnée par l’API si elle l’indique, sinon lignes déjà rapportées ; bornée à [0, 100]. */
export function progress(done: number, total: number, suite?: unknown): number {
  if (suite && typeof suite === 'object') {
    const s = suite as Record<string, unknown>
    const pos = [s.fait, s.traitees, s.depart, s.offset, s.debut].find((x) => typeof x === 'number') as number | undefined
    const tot = typeof s.total === 'number' ? s.total : total
    if (pos != null && tot > 0) return Math.min(100, Math.max(0, Math.round((pos / tot) * 100)))
  }
  if (typeof suite === 'number' && total > 0) return Math.min(100, Math.max(0, Math.round((suite / total) * 100)))
  if (total <= 0) return hasMore(suite) ? 0 : 100
  return hasMore(suite) ? Math.min(99, Math.round((done / total) * 100)) : 100
}

/** Rapport cumulé de plusieurs lots. */
export function mergeReports(a: Report | null, b: Report): Report {
  if (!a) return { ...b, suite: undefined }
  const cat = <T,>(x?: T[], y?: T[]) => (x || y ? [...(x ?? []), ...(y ?? [])] : undefined)
  return {
    mode: b.mode,
    lignes: a.lignes + b.lignes,
    colonnesIgnorees: [...new Set([...a.colonnesIgnorees, ...b.colonnesIgnorees])],
    aCreer: [...a.aCreer, ...b.aCreer],
    doublons: [...a.doublons, ...b.doublons],
    erreurs: [...a.erreurs, ...b.erreurs],
    crees: cat(a.crees, b.crees),
    echecs: cat(a.echecs, b.echecs),
  }
}
