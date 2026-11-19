import { allowed, principalLabel } from './context'
import { closeReqContext, openReqContext } from './reqContext'
import { DRAFT_ONLY_CHANNELS, type ActionContext, type ActionDef } from './types'
import { validateInput } from './validate'

export type ActionErrorCode = 'not_found' | 'forbidden' | 'invalid_input' | 'failed'
export class ActionError extends Error {
  constructor(
    public code: ActionErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'ActionError'
  }
}

export type ActionAudit = { def: ActionDef; ctx: ActionContext; ok: boolean; summary: string; consumed: boolean }

export type RunnerDeps = {
  actions: () => ActionDef[]
  notify: (text: string, opts: { actionId: string }) => Promise<void>
  audit: (entry: ActionAudit) => Promise<void>
}

/** Champs de publication retirés d’une écriture venue d’une IA, de Telegram, de WhatsApp ou d’un import. */
const PUBLISH_KEYS = ['_status', 'status', 'publier', 'publish', 'published']

const short = (v: unknown, n = 300) => {
  const s = typeof v === 'string' ? v : JSON.stringify(v) ?? ''
  return s.length > n ? `${s.slice(0, n)}…` : s
}

const summaryOf = (result: unknown) => {
  const r = result as { summary?: unknown; message?: unknown; url?: unknown } | null
  if (r && typeof r.summary === 'string') return r.summary
  if (r && typeof r.message === 'string') return r.message
  if (r && typeof r.url === 'string') return r.url
  return short(result, 200)
}

const safely = async (p: () => Promise<void>) => {
  try {
    await p()
  } catch (e) {
    console.error('[actions] notification ou journal impossible', e)
  }
}

/**
 * Exécuteur commun : action connue, accès selon le rôle, entrée validée, brouillon forcé selon le canal,
 * équipe prévenue avant et après une écriture, journal d’audit.
 */
export function createRunner(deps: RunnerDeps) {
  return async function runAction(name: string, input: unknown, ctx: ActionContext): Promise<unknown> {
    const def = deps.actions().find((a) => a.name === name)
    if (!def) throw new ActionError('not_found', `Action inconnue : ${name}.`)
    if (!allowed(def.access, ctx.principal)) throw new ActionError('forbidden', def.access === 'admin' ? 'Réservé à un administrateur (patron ou admin).' : 'Réservé à l’équipe DALIL.')
    const v = validateInput(def.input, input)
    if (!v.ok) throw new ActionError('invalid_input', v.error)
    const value = { ...v.value }
    const draftOnly = DRAFT_ONLY_CHANNELS.includes(ctx.channel)
    if (draftOnly && !def.readOnly && def.access === 'admin' && !ctx.confirmed)
      throw new ActionError('forbidden', 'À confirmer : cliquez le bouton signé (Telegram, WhatsApp) ou faites-le dans /admin.')
    if (draftOnly && !def.readOnly) {
      // Publication à distance : seulement par un compte patron/admin identifié (le « clic humain »).
      if (def.access === 'admin' && !(ctx.principal.kind === 'staff' && (ctx.principal.role === 'patron' || ctx.principal.role === 'admin')))
        throw new ActionError('forbidden', 'Publication réservée à un administrateur.')
      if (def.access !== 'admin') for (const k of PUBLISH_KEYS) delete value[k]
    }
    if (def.readOnly) return def.run(value, ctx)

    const who = principalLabel(ctx.principal)
    await safely(() => deps.notify(`${who} lance « ${def.title} » (${ctx.channel})\n${short(value)}`, { actionId: ctx.actionId }))
    openReqContext(ctx, def.name)
    try {
      const result = await def.run(value, ctx)
      const { consumed } = closeReqContext(ctx.actionId)
      const summary = summaryOf(result)
      await safely(() => deps.notify(`Terminé : « ${def.title} » — ${summary}`, { actionId: ctx.actionId }))
      await safely(() => deps.audit({ def, ctx, ok: true, summary, consumed }))
      return result
    } catch (e) {
      const { consumed } = closeReqContext(ctx.actionId)
      const msg = e instanceof Error ? e.message : String(e)
      await safely(() => deps.notify(`Échec : « ${def.title} » — ${msg}`, { actionId: ctx.actionId }))
      await safely(() => deps.audit({ def, ctx, ok: false, summary: msg, consumed }))
      if (e instanceof ActionError) throw e
      console.error('[actions] échec', def.name, e)
      throw new ActionError('failed', 'Erreur interne : action non effectuée. L’équipe est prévenue.')
    }
  }
}
