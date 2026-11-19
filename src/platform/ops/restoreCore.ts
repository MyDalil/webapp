/** Valeurs « avant » d’une ligne d’audit (pures, testées). Le journal tronque à 300 caractères : une valeur tronquée n’est jamais réappliquée. */
export function previousFromAudit(changes: unknown): { ok: true; data: Record<string, unknown> } | { ok: false; reason: string } {
  if (!changes || typeof changes !== 'object' || !Object.keys(changes).length) return { ok: false, reason: 'Aucune modification enregistrée dans le journal : rien à restaurer.' }
  const data: Record<string, unknown> = {}
  const truncated: string[] = []
  for (const [k, v] of Object.entries(changes as Record<string, { avant?: unknown }>)) {
    if (!v || typeof v !== 'object' || !('avant' in v)) continue
    const before = v.avant
    if (typeof before === 'string' && before.length === 301 && before.endsWith('…')) truncated.push(k)
    else data[k] = before ?? null
  }
  if (truncated.length) return { ok: false, reason: `Restauration impossible : le journal ne garde pas la valeur complète de ${truncated.join(', ')}. Utilisez la sauvegarde quotidienne.` }
  if (!Object.keys(data).length) return { ok: false, reason: 'Le journal ne contient pas les valeurs précédentes.' }
  return { ok: true, data }
}
