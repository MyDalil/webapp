/**
 * Contrat commun des actions DALIL (19 nov. 2026).
 * Une action = une fonction métier appelée à l’identique par le site (appel direct), le serveur MCP,
 * Telegram, WhatsApp, l’admin et les tâches planifiées. Ne pas modifier sans accord du responsable du lot B.
 */
export type Lang = 'fr' | 'en' | 'ar'
export type Channel = 'site' | 'mcp' | 'telegram' | 'whatsapp' | 'admin' | 'cron'
export type StaffRole = 'patron' | 'admin' | 'editor' | 'conseiller'

export type Principal =
  | { kind: 'public' }
  | { kind: 'staff'; userId: number; role: StaffRole; name: string }

export type ActionContext = {
  principal: Principal
  channel: Channel
  /** Identifiant unique de l’action, relié au journal d’audit et aux notifications. */
  actionId: string
  lang: Lang
  /** Vrai seulement quand un administrateur a cliqué un bouton signé (Telegram, WhatsApp) : seul cas où une action admin d’écriture passe sur un canal distant. */
  confirmed?: boolean
}

export type JsonSchema = Record<string, unknown>

/** public = tout le monde ; staff = patron, admin, editor ; admin = patron, admin (seuls à publier). */
export type ActionAccess = 'public' | 'staff' | 'admin'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ActionDef<I = any, O = any> = {
  /** snake_case, unique, en français : chercher_ecole, voir_fiche, creer_brouillon… */
  name: string
  /** Libellé court en français. */
  title: string
  /** Pour les IA : à quoi sert l’outil et quand l’utiliser. */
  description: string
  module: string
  access: ActionAccess
  readOnly: boolean
  /** JSON Schema de l’entrée (type: 'object'). */
  input: JsonSchema
  run: (input: I, ctx: ActionContext) => Promise<O>
}

/** Règle commune : une écriture venant d’une IA, de Telegram, de WhatsApp ou d’un import crée un brouillon, jamais une publication. */
export const DRAFT_ONLY_CHANNELS: readonly Channel[] = ['mcp', 'telegram', 'whatsapp', 'cron']
