import 'server-only'
import { createLocalReq, type Payload, type PayloadRequest } from 'payload'
import type { ActionContext } from '@/platform/actions/types'

/** Canal de l’action → canal du journal d’audit. */
const AUDIT_CHANNEL = { site: 'admin', admin: 'admin', telegram: 'telegram', whatsapp: 'api', mcp: 'agent', cron: 'cron' } as const

export const isAdminRole = (ctx: ActionContext) => ctx.principal.kind === 'staff' && (ctx.principal.role === 'admin' || ctx.principal.role === 'patron')
export const isStaffRole = (ctx: ActionContext) => ctx.principal.kind === 'staff' && ctx.principal.role !== 'conseiller'

/** Requête Payload au nom du compte équipe : l’audit attribue l’action à la bonne personne, au bon canal, avec l’identifiant d’action. */
export async function staffReq(payload: Payload, ctx: ActionContext): Promise<PayloadRequest> {
  const user = ctx.principal.kind === 'staff' ? await payload.findByID({ collection: 'users', id: ctx.principal.userId, depth: 0, overrideAccess: true }).catch(() => null) : null
  const req = await createLocalReq({ user: user ? ({ ...user, collection: 'users' } as never) : undefined }, payload)
  req.context = { ...(req.context ?? {}), channel: AUDIT_CHANNEL[ctx.channel], actionId: ctx.actionId }
  return req
}

export class OpsError extends Error {}
export function requireRole(ctx: ActionContext, level: 'staff' | 'admin') {
  if (level === 'admin' ? !isAdminRole(ctx) : !isStaffRole(ctx)) throw new OpsError(level === 'admin' ? 'Réservé aux administrateurs.' : 'Réservé à l’équipe.')
}
