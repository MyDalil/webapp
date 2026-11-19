import type { ActionContext } from './types'

/**
 * Contexte Payload (`req.context`) partagé par toutes les opérations d’une même action.
 * Le journal d’audit consomme `actionId` sur la première ligne écrite (fiche créée ou modifiée) :
 * l’identifiant relie alors la notification équipe à l’historique de la fiche.
 */
export type ActionReqContext = { actionId?: string; channel: string; actionName: string }

const live = new Map<string, ActionReqContext>()

export function openReqContext(ctx: ActionContext, actionName: string): ActionReqContext {
  const c: ActionReqContext = { actionId: ctx.actionId, channel: ctx.channel, actionName }
  live.set(ctx.actionId, c)
  return c
}

/** À passer en `context` aux appels Payload d’une action. */
export function reqContextOf(ctx: ActionContext): ActionReqContext {
  return live.get(ctx.actionId) ?? { actionId: ctx.actionId, channel: ctx.channel, actionName: '' }
}

/** Ferme le contexte ; `consumed` = une ligne d’audit Payload porte déjà l’identifiant de l’action. */
export function closeReqContext(actionId: string): { consumed: boolean } {
  const c = live.get(actionId)
  live.delete(actionId)
  return { consumed: !!c && !c.actionId }
}
