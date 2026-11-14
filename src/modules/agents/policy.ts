import { touchesForbidden } from './referentiel'

/**
 * Politique d’autonomie (décision de Rad, 14 nov. 2026 : mode mixte).
 * - Plancher codé : interdictions dures et Vie musulmane, jamais levées, quel que soit le réglage.
 * - Réglage vivant dans Neon (champ `toolModes` de chaque agent), modifiable en un clic dans /admin.
 * - Défaut : les tâches sans risque s’exécutent seules (avec notification) ; le reste attend une validation.
 */
export type Mode = 'execute' | 'propose' | 'forbidden'
export type Decision = { mode: 'execute' | 'propose' } | { mode: 'deny'; reason: 'interdit' | 'vie-musulmane' | 'arret-general' | 'outil-inconnu' | 'reglage' }
type KillSwitch = 'off' | 'drain' | 'stop' | 'cut'

/** Jamais exécutable par un agent : le code refuse avant tout réglage. */
export const HARD_FORBIDDEN = ['delete-record', 'execute-payment', 'publish-without-validation', 'deploy', 'change-roles'] as const

/** Brouillons : toujours une proposition, même réglés « exécute » (rien n’est publié sans un humain). */
export const ALWAYS_PROPOSE = ['draft-content', 'draft-email', 'draft-telegram'] as const

export const DEFAULT_MODES: Record<string, Mode> = {
  // Lecture et coordination : sans effet sur le site.
  'read-content': 'execute',
  'web-search': 'execute',
  'read-inbox': 'execute',
  'read-health': 'execute',
  'message-agents': 'execute',
  'create-tasks': 'execute',
  // Tâches sans risque : exécutées seules, notifiées, réversibles (historique).
  translate: 'execute',
  'write-alt-text': 'execute',
  'suggest-tags': 'execute',
  'fix-broken-links': 'execute',
  // Tout ce qui se voit ou engage DALIL : proposé, un humain valide.
  'draft-content': 'propose',
  'draft-email': 'propose',
  'draft-telegram': 'propose',
  'review-classifieds': 'propose',
}

export function decide(input: { tool: string; agentModes?: Partial<Record<string, Mode>> | null; texts: Array<string | null | undefined>; killSwitch: KillSwitch }): Decision {
  const { tool, agentModes, texts, killSwitch } = input
  if (killSwitch === 'stop' || killSwitch === 'cut') return { mode: 'deny', reason: 'arret-general' }
  if ((HARD_FORBIDDEN as readonly string[]).includes(tool)) return { mode: 'deny', reason: 'interdit' }
  if (touchesForbidden(...texts)) return { mode: 'deny', reason: 'vie-musulmane' }
  const base = DEFAULT_MODES[tool]
  if (!base) return { mode: 'deny', reason: 'outil-inconnu' }
  const mode = agentModes?.[tool] ?? base
  if (mode === 'forbidden') return { mode: 'deny', reason: 'reglage' }
  if (mode === 'execute' && (ALWAYS_PROPOSE as readonly string[]).includes(tool)) return { mode: 'propose' }
  return { mode }
}

/** Convertit le tableau Neon `toolModes` en dictionnaire. */
export const modesOf = (rows: Array<{ tool?: string | null; mode?: string | null }> | null | undefined) =>
  Object.fromEntries((rows ?? []).filter((r) => r.tool && r.mode).map((r) => [r.tool as string, r.mode as Mode]))
