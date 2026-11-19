import type { ActionDef, Principal } from '@/platform/actions/types'

/**
 * Télécommande DALIL (Telegram, WhatsApp) — analyse pure, testée, sans accès réseau ni base.
 * Les commandes ne portent aucune logique métier : elles choisissent une action du registre et remplissent son entrée.
 */
export type RemoteCommand =
  | { kind: 'start' }
  | { kind: 'aide' }
  | { kind: 'action'; cmd: CommandName; args: string }
  | { kind: 'publier'; ref: string }
  | { kind: 'rejeter'; ref: string; motif: string }
  | { kind: 'corriger'; ref: string; text: string }
  | { kind: 'defi'; wilaya: string; theme: string }
  | { kind: 'texte'; text: string }
  | { kind: 'erreur'; message: string }

/** Commandes qui appellent une action du registre avec le reste du message. */
export type CommandName = 'chercher' | 'fiche' | 'brouillon' | 'csv' | 'controle' | 'newsletter' | 'traduire' | 'restaurer' | 'etat' | 'finir' | 'relancer'

/**
 * Noms d’actions possibles pour chaque commande, par ordre de préférence. Le premier nom présent dans
 * actionsFor(principal) l’emporte (nom exact, puis nom qui commence par le candidat).
 */
export const COMMAND_ACTIONS: Record<CommandName | 'publier' | 'rejeter' | 'corriger' | 'contribuer', string[]> = {
  chercher: ['rechercher'],
  fiche: ['voir_fiche'],
  brouillon: ['creer_brouillon_lieu'],
  csv: ['importer_csv'],
  controle: ['controle_securite'],
  newsletter: ['preparer_newsletter'],
  traduire: ['traduire'],
  restaurer: ['restaurer'],
  etat: ['etat_du_site'],
  finir: ['arreter_le_site'],
  relancer: ['relancer_le_site'],
  publier: ['publier_fiche'],
  rejeter: ['rejeter_fiche'],
  corriger: ['modifier_brouillon'],
  contribuer: ['proposer_contribution'],
}

const SIMPLE: readonly CommandName[] = ['chercher', 'fiche', 'brouillon', 'csv', 'controle', 'newsletter', 'traduire', 'restaurer', 'etat', 'finir', 'relancer']
const REF = /^[A-Za-z0-9-]{1,40}$/

/** Analyse un message. `botName` : nom du bot (sans @), pour accepter « /chercher@DalilBot ». */
export function parseRemote(raw: string, botName?: string): RemoteCommand {
  let text = raw.trim()
  if (botName) text = text.replace(new RegExp(`@${botName}\\b`, 'gi'), '').trim()
  if (!text) return { kind: 'erreur', message: 'Message vide.' }
  if (!text.startsWith('/')) return { kind: 'texte', text: text.slice(0, 3000) }
  const [head, ...rest] = text.split(/\s+/)
  const cmd = head.slice(1).split('@')[0].toLowerCase()
  const arg = rest.join(' ').trim()
  if (cmd === 'start') return { kind: 'start' }
  if (cmd === 'aide' || cmd === 'help') return { kind: 'aide' }
  if ((SIMPLE as readonly string[]).includes(cmd)) {
    if (!arg && ['chercher', 'fiche', 'brouillon', 'traduire', 'restaurer'].includes(cmd)) return { kind: 'erreur', message: `Texte manquant. Exemple : /${cmd} ${cmd === 'chercher' ? 'pharmacie de garde Oran' : '…'}` }
    return { kind: 'action', cmd: cmd as CommandName, args: arg.slice(0, 3000) }
  }
  if (cmd === 'publier' || cmd === 'rejeter' || cmd === 'corriger') {
    const ref = rest[0] ?? ''
    if (!REF.test(ref)) return { kind: 'erreur', message: `Référence manquante. Exemple : /${cmd} 12${cmd === 'rejeter' ? ' source trop ancienne' : cmd === 'corriger' ? ' horaires : 8h-17h' : ''}` }
    const tail = rest.slice(1).join(' ').trim()
    if (cmd === 'publier') return { kind: 'publier', ref }
    if (cmd === 'rejeter') return tail ? { kind: 'rejeter', ref, motif: tail.slice(0, 500) } : { kind: 'erreur', message: `Motif manquant. Exemple : /rejeter ${ref} source trop ancienne` }
    return tail ? { kind: 'corriger', ref, text: tail.slice(0, 2000) } : { kind: 'erreur', message: `Correction manquante. Exemple : /corriger ${ref} horaires : 8h-17h` }
  }
  if (cmd === 'defi') {
    const [wilaya, ...theme] = rest
    return wilaya && theme.length ? { kind: 'defi', wilaya: wilaya.slice(0, 60), theme: theme.join(' ').slice(0, 200) } : { kind: 'erreur', message: 'Exemple : /defi Oran pharmacies de garde' }
  }
  return { kind: 'erreur', message: `Commande inconnue : /${cmd}. Tapez /aide.` }
}

/** Une demande de visiteur qui propose une adresse : transmise en contribution, jamais en fiche. */
export function looksLikeContribution(text: string): boolean {
  return /^\s*(ajout(e|ez|er)?|propos(e|ez|er)|il manque|contribu|signal(e|ez|er)|نضيف|اضف|أضف)/i.test(text)
}

/** Un message de groupe s’adresse-t-il au bot ? (mention @bot ou /chercher). */
export function addressedToBot(text: string, botName?: string): boolean {
  const t = text.trim().toLowerCase()
  if (/^\/chercher(@\w+)?(\s|$)/.test(t)) return true
  return Boolean(botName && t.includes(`@${botName.toLowerCase()}`))
}

export const isPublisher = (p: Principal) => p.kind === 'staff' && (p.role === 'patron' || p.role === 'admin')

/** Trouve l’action d’une commande parmi celles autorisées (nom exact d’abord, puis préfixe). */
export function resolveAction(actions: ActionDef[], candidates: string[]): ActionDef | null {
  for (const c of candidates) {
    const exact = actions.find((a) => a.name === c)
    if (exact) return exact
  }
  for (const c of candidates) {
    const pre = actions.find((a) => a.name.startsWith(`${c}_`))
    if (pre) return pre
  }
  return null
}

type Props = Record<string, { type?: unknown }>
const props = (a: ActionDef): Props | null => {
  const p = (a.input as { properties?: unknown }).properties
  return p && typeof p === 'object' ? (p as Props) : null
}

/** Garde seulement les champs connus du schéma de l’action (tout si le schéma ne les déclare pas). */
export function fitInput(a: ActionDef, values: Record<string, unknown>): Record<string, unknown> {
  const p = props(a)
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(values)) if (v !== undefined && v !== null && v !== '' && (!p || k in p)) out[k] = v
  return out
}

const TEXT_KEYS = ['q', 'query', 'recherche', 'texte', 'text', 'consigne', 'demande', 'message', 'contenu', 'id', 'slug', 'csv']

/** Met un texte libre dans le champ texte de l’action (nom usuel, sinon premier champ requis de type chaîne). */
export function textInput(a: ActionDef, text: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  const p = props(a)
  const base = fitInput(a, extra)
  if (!text) return base
  if (!p) return { q: text, ...base }
  const required = ((a.input as { required?: unknown }).required as string[] | undefined) ?? []
  const key = TEXT_KEYS.find((k) => k in p && !(k in base)) ?? required.find((k) => p[k]?.type === 'string' && !(k in base)) ?? Object.keys(p).find((k) => p[k]?.type === 'string' && !(k in base))
  return key ? { ...base, [key]: text } : base
}

/** Résultats d’une recherche (tableau direct ou dans results/items/docs/resultats). */
export function listOf(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[]
  if (result && typeof result === 'object') {
    for (const k of ['results', 'resultats', 'items', 'docs', 'fiches']) {
      const v = (result as Record<string, unknown>)[k]
      if (Array.isArray(v)) return v as Record<string, unknown>[]
    }
  }
  return []
}

/** Réponse courte pour un visiteur : 3 résultats au plus, chacun avec son lien mydalil.com. */
export function formatResults(result: unknown, site: string, max = 3): string {
  const items = listOf(result).slice(0, max)
  if (!items.length) return 'Aucun résultat. Essayez d’autres mots, ou cherchez sur mydalil.com.'
  return items
    .map((it, i) => {
      const name = String(it.title ?? it.name ?? it.nom ?? it.titre ?? 'Résultat')
      const where = it.wilaya ?? it.commune ?? it.city
      const raw = String(it.url ?? it.path ?? it.href ?? '')
      const link = raw.startsWith('http') ? raw : raw ? `${site}${raw.startsWith('/') ? '' : '/'}${raw}` : ''
      return `${i + 1}. ${name}${where ? ` — ${String(where)}` : ''}${link ? `\n${link}` : ''}`
    })
    .join('\n\n')
}

/** Résumé lisible du résultat d’une action (avant/après si l’action les donne). */
export function formatOutcome(result: unknown): string {
  if (result == null) return 'Fait.'
  if (typeof result === 'string') return result.slice(0, 3500)
  if (typeof result !== 'object') return String(result)
  const r = result as Record<string, unknown>
  const lines: string[] = []
  if (typeof r.summary === 'string') lines.push(r.summary)
  else if (typeof r.message === 'string') lines.push(r.message)
  const show = (v: unknown) => (typeof v === 'string' ? v : JSON.stringify(v))?.slice(0, 1200)
  if ('before' in r || 'after' in r) {
    lines.push(`Avant : ${r.before == null ? '—' : show(r.before)}`, `Après : ${r.after == null ? '—' : show(r.after)}`)
  }
  if (!lines.length) lines.push(show(r) ?? 'Fait.')
  return lines.join('\n').slice(0, 3500)
}

/** Sortie JSON stricte de l’IA : { "action": nom | null, "input": {…}, "reply"?: texte }. Null si invalide. */
export function parseAiChoice(text: string, allowed: string[]): { action: string; input: Record<string, unknown> } | { action: null; reply: string } | null {
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) return null
  try {
    const j = JSON.parse(m[0]) as { action?: unknown; input?: unknown; reply?: unknown }
    if (j.action === null) return { action: null, reply: typeof j.reply === 'string' ? j.reply.slice(0, 1000) : 'Je n’ai pas compris. Tapez /aide.' }
    if (typeof j.action !== 'string' || !allowed.includes(j.action)) return null
    const input = j.input && typeof j.input === 'object' && !Array.isArray(j.input) ? (j.input as Record<string, unknown>) : {}
    return { action: j.action, input }
  } catch {
    return null
  }
}

/** Numéro WhatsApp (wa_id sans « + ») → E.164. */
export const toE164 = (waId: string) => `+${waId.replace(/\D/g, '')}`

export const AIDE_EQUIPE = [
  'Télécommande DALIL — écrivez, dictez ou envoyez une photo.',
  '/chercher pharmacie de garde Oran',
  '/fiche 123 — voir une fiche',
  '/brouillon texte — préparer un brouillon de fiche',
  '/publier ID · /rejeter ID motif · /corriger ID correction',
  '/csv + fichier joint — simulation · /csv confirmer — import en brouillon',
  '/controle · /newsletter · /traduire · /restaurer',
  '/etat — état du site · /finir — arrêt général (finir puis arrêter) · /relancer — lever l’arrêt (bouton Confirmer, patron et admin)',
  '/defi Oran pharmacies — défi wilaya pour le canal (Publier après clic)',
  'Toute écriture crée un brouillon. Publication : bouton [Publier], comptes patron et admin seulement.',
].join('\n')

export const AIDE_PUBLIC = [
  'DALIL — le guide de confiance de l’Algérie.',
  '/chercher pharmacie de garde Oran — 3 résultats avec leurs liens.',
  'Pour proposer une adresse : « Ajoutez … » suivi du nom, de l’adresse et du téléphone. L’équipe vérifie avant publication.',
  'Tout le guide : https://www.mydalil.com',
].join('\n')
