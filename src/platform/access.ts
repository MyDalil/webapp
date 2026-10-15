import type { Access, FieldAccess } from 'payload'

type Role = 'admin' | 'editor'

/** Seuls les comptes de l’équipe (collection « users ») ont un rôle ; un compte public n’est jamais staff. */
const hasRole = (user: unknown, roles: Role[]) => {
  const u = user as { collection?: string; role?: Role } | null
  return !!u && u.collection === 'users' && roles.includes((u.role ?? 'editor') as Role)
}

/** Compte de l’équipe avec le rôle administrateur (jamais un compte public). */
export const isAdminUser = (user: unknown) => hasRole(user, ['admin'])
export const isStaffUser = (user: unknown) => hasRole(user, ['admin', 'editor'])

/** Compte public connecté (particulier ou professionnel). */
export const isMember = (user: unknown): user is { id: number; collection: 'members'; kind: 'particulier' | 'pro'; email: string } =>
  !!user && (user as { collection?: string }).collection === 'members'

export const isAdmin: Access = ({ req: { user } }) => hasRole(user, ['admin'])
export const isStaff: Access = ({ req: { user } }) => hasRole(user, ['admin', 'editor'])
export const isAdminField: FieldAccess = ({ req: { user } }) => hasRole(user, ['admin'])

export const anyone: Access = () => true

/** Public : uniquement les documents publiés. Équipe : tout, brouillons compris. */
export const publishedOrStaff: Access = ({ req: { user } }) => {
  if (hasRole(user, ['admin', 'editor'])) return true
  return { _status: { equals: 'published' } }
}
