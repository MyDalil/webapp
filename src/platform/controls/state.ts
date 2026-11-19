import type { ControlsDoc, KillSwitch } from './Controls'

/** Logique pure de l’arrêt général et de l’état du site (testée dans state.test.ts). */
export type StateInput = {
  controls: ControlsDoc
  aiConfigured: boolean
  aiSpentMicros: number | null
  aiBudgetUsd: number
  lastBackup: string | null
  errors: { total: number; last: string[] } | null
}

const RANK: Record<KillSwitch, number> = { off: 0, drain: 1, stop: 2, cut: 3 }
const LABEL: Record<KillSwitch, string> = { off: 'désactivé — tout fonctionne', drain: 'finir puis arrêter', stop: 'arrêter maintenant', cut: 'tout couper' }

/** Données à écrire pour un arrêt ; null si un arrêt égal ou plus fort est déjà actif (jamais d’adoucissement à distance). */
export function killSwitchUpdate(current: KillSwitch, mode: 'drain' | 'stop', reason: string): { killSwitch: KillSwitch; killSwitchReason: string } | null {
  if (RANK[current] >= RANK[mode]) return null
  return { killSwitch: mode, killSwitchReason: reason.slice(0, 300) }
}

export function siteState(s: StateInput, now = Date.now()) {
  const c = s.controls
  const hours = s.lastBackup ? Math.round((now - Date.parse(s.lastBackup)) / 3_600_000) : null
  const spentUsd = s.aiSpentMicros == null ? null : Math.round(s.aiSpentMicros / 10_000) / 100
  const lines = [
    `Arrêt général : ${LABEL[c.killSwitch] ?? c.killSwitch}`,
    `Agents IA : ${c.agentsEnabled ? 'actifs' : 'désactivés'} · budget agents : ${c.agentsMonthlyBudgetUsd ? `${c.agentsMonthlyBudgetUsd} $/mois` : 'non défini'}`,
    `Telegram : ${c.telegramEnabled === false ? 'désactivé' : 'actif'} · maintenance : ${c.maintenance ? 'oui' : 'non'}`,
    `IA du site : ${s.aiConfigured ? 'clé présente' : 'clé absente'} · dépense du mois : ${spentUsd == null ? 'à vérifier' : `${spentUsd} $`} / ${s.aiBudgetUsd} $`,
    `Dernière sauvegarde réussie : ${hours == null ? 'aucune trouvée' : `il y a ${hours} h${hours > 36 ? ' (EN RETARD)' : ''}`}`,
    `Erreurs non résolues (24 h) : ${s.errors == null ? 'à vérifier' : s.errors.total}${s.errors?.last.length ? `\n- ${s.errors.last.join('\n- ')}` : ''}`,
  ]
  return {
    summary: lines.join('\n'),
    arretGeneral: c.killSwitch,
    agents: Boolean(c.agentsEnabled),
    telegram: c.telegramEnabled !== false,
    maintenance: Boolean(c.maintenance),
    ia: { cle: s.aiConfigured, depenseMoisUsd: spentUsd, budgetUsd: s.aiBudgetUsd },
    sauvegarde: { derniereReussie: s.lastBackup, ilYaHeures: hours, enRetard: hours == null || hours > 36 },
    erreurs24h: s.errors,
  }
}
