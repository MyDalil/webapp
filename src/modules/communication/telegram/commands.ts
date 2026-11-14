/**
 * Commandes du bot Telegram de DALIL (Saïd et Rad seulement). Analyse pure, testée.
 * Un texte sans commande devient une tâche pour le CEO.
 */
export type Command =
  | { kind: 'start' }
  | { kind: 'aide' }
  | { kind: 'etat' }
  | { kind: 'taches' }
  | { kind: 'task'; action: 'valider' | 'rejeter' | 'pause' | 'reprendre' | 'annuler'; id: number; note?: string }
  | { kind: 'directive'; id: number; text: string }
  | { kind: 'role'; action: 'activer' | 'reserve'; slug: string }
  | { kind: 'arret'; mode: 'stop' | 'drain' | 'cut' | 'off' }
  | { kind: 'publier'; id: number }
  | { kind: 'ordre'; text: string }
  | { kind: 'erreur'; message: string }

const TASK_ACTIONS = ['valider', 'rejeter', 'pause', 'reprendre', 'annuler'] as const
const ARRET: Record<string, 'stop' | 'drain' | 'cut' | 'off'> = { stop: 'stop', finir: 'drain', couper: 'cut', relancer: 'off' }

export function parseCommand(raw: string): Command {
  const text = raw.trim()
  if (!text) return { kind: 'erreur', message: 'Message vide.' }
  if (!text.startsWith('/')) return { kind: 'ordre', text: text.slice(0, 3000) }
  const [head, ...rest] = text.split(/\s+/)
  const cmd = head.slice(1).split('@')[0].toLowerCase()
  const arg = rest.join(' ').trim()
  const id = Number(rest[0])
  const needId = () => (Number.isInteger(id) && id > 0 ? null : { kind: 'erreur' as const, message: `Numéro de tâche manquant. Exemple : /${cmd} 12` })
  if (cmd === 'start') return { kind: 'start' }
  if (cmd === 'aide' || cmd === 'help') return { kind: 'aide' }
  if (cmd === 'etat') return { kind: 'etat' }
  if (cmd === 'taches') return { kind: 'taches' }
  if ((TASK_ACTIONS as readonly string[]).includes(cmd)) return needId() ?? { kind: 'task', action: cmd as (typeof TASK_ACTIONS)[number], id, note: rest.slice(1).join(' ').trim() || undefined }
  if (cmd === 'directive') {
    const e = needId()
    if (e) return e
    const t = rest.slice(1).join(' ').trim()
    return t ? { kind: 'directive', id, text: t.slice(0, 2000) } : { kind: 'erreur', message: 'Texte de la directive manquant. Exemple : /directive 12 garde les horaires du vendredi à part' }
  }
  if (cmd === 'activer' || cmd === 'reserve') return arg ? { kind: 'role', action: cmd, slug: arg.toLowerCase().replace(/[^a-z0-9-]/g, '') } : { kind: 'erreur', message: `Rôle manquant. Exemple : /${cmd} seo-geo` }
  if (cmd in ARRET) return { kind: 'arret', mode: ARRET[cmd] }
  if (cmd === 'publier') return needId() ?? { kind: 'publier', id }
  return { kind: 'erreur', message: `Commande inconnue : /${cmd}. Tapez /aide.` }
}

export const AIDE = [
  'Commandes DALIL :',
  '/etat — arrêt général, agents, tâches, coût IA du mois',
  '/taches — tâches en cours et à valider',
  '/valider 12 · /rejeter 12 raison · /pause 12 · /reprendre 12 · /annuler 12',
  '/directive 12 texte — nouvelle consigne pendant le travail',
  '/activer seo-geo · /reserve seo-geo — rôles de l’équipe',
  '/stop · /finir · /couper · /relancer — arrêt général',
  '/publier 5 — publier un brouillon sur le canal (Saïd seul)',
  'Un message sans commande devient une tâche pour le CEO.',
].join('\n')
