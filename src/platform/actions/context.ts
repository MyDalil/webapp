import type { ActionAccess, ActionContext, Channel, Lang, Principal, StaffRole } from './types'

/** Rôles autorisés par niveau d’accès (voir types.ts). Le conseiller n’a que l’accès public. */
const ROLES: Record<ActionAccess, readonly StaffRole[] | null> = { public: null, staff: ['patron', 'admin', 'editor'], admin: ['patron', 'admin'] }

export function allowed(access: ActionAccess, principal: Principal): boolean {
  const roles = ROLES[access]
  if (!roles) return true
  return principal.kind === 'staff' && roles.includes(principal.role)
}

export const PUBLIC: Principal = { kind: 'public' }

/** Compte /admin (collection « users ») → principal ; tout autre compte (membre, agent, aucun) → public. */
export function principalFromUser(user: unknown): Principal {
  const u = user as { collection?: string; id?: number; role?: string; name?: string; email?: string } | null | undefined
  if (!u || u.collection !== 'users' || typeof u.id !== 'number') return PUBLIC
  const role = (['patron', 'admin', 'editor', 'conseiller'] as const).find((r) => r === (u.role ?? 'editor'))
  if (!role) return PUBLIC
  return { kind: 'staff', userId: u.id, role, name: u.name || 'Équipe' }
}

/** Contexte d’une page du site : visiteur public, canal « site ». */
export function siteContext(lang: Lang, actionId: string = crypto.randomUUID()): ActionContext {
  return { principal: PUBLIC, channel: 'site', actionId, lang }
}

export function contextFor(principal: Principal, channel: Channel, lang: Lang, actionId: string): ActionContext {
  return { principal, channel, actionId, lang }
}

export const principalLabel = (p: Principal) => (p.kind === 'staff' ? `${p.name} (${p.role})` : 'Public')
