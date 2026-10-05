import type { Access, FieldAccess } from 'payload'

type Role = 'admin' | 'editor'

const hasRole = (user: unknown, roles: Role[]) =>
  !!user && roles.includes(((user as { role?: Role }).role ?? 'editor') as Role)

export const isAdmin: Access = ({ req: { user } }) => hasRole(user, ['admin'])
export const isStaff: Access = ({ req: { user } }) => hasRole(user, ['admin', 'editor'])
export const isAdminField: FieldAccess = ({ req: { user } }) => hasRole(user, ['admin'])

export const anyone: Access = () => true

/** Public : uniquement les documents publiés. Équipe : tout, brouillons compris. */
export const publishedOrStaff: Access = ({ req: { user } }) => {
  if (hasRole(user, ['admin', 'editor'])) return true
  return { _status: { equals: 'published' } }
}
