import 'server-only'
import type { Payload, TypedUser } from 'payload'
import { payload } from '@/platform/http'
import { reqContextOf } from './reqContext'
import type { ActionContext } from './types'

/**
 * Accès Payload d’une action : le compte du principal (rôle relu en base), accès Payload appliqué
 * (`overrideAccess: false` : un public ne lit que le publié, un rédacteur ne publie pas),
 * et `context` = { actionId, channel } pour le journal d’audit et les hooks.
 */
export async function payloadFor(ctx: ActionContext): Promise<{ payload: Payload; opts: { overrideAccess: false; user: TypedUser | undefined; context: Record<string, unknown> } }> {
  const p = await payload()
  let user: TypedUser | undefined
  if (ctx.principal.kind === 'staff') {
    const u = await p.findByID({ collection: 'users', id: ctx.principal.userId, depth: 0, overrideAccess: true }).catch(() => null)
    if (u) user = { ...u, collection: 'users' }
  }
  return { payload: p, opts: { overrideAccess: false, user, context: reqContextOf(ctx) as unknown as Record<string, unknown> } }
}
