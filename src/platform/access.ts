import type { Access, FieldAccess } from 'payload'

/**
 * Rôles de l’équipe (collection « users ») :
 * - patron : tous les droits d’un administrateur, plus les droits réservés (canal Telegram, Vie musulmane, rôle patron) ;
 * - admin : publie et gère tout ;
 * - editor : prépare, ne publie pas ;
 * - conseiller : traite les demandes d’accompagnement, et rien d’autre (jamais staff).
 * Les agents IA sont dans la collection « agents » : ils ne sont jamais staff et ne publient jamais.
 */
type Role = 'patron' | 'admin' | 'editor' | 'conseiller'

/** Seuls les comptes de l’équipe (collection « users ») ont un rôle ; un compte public n’est jamais staff. */
const hasRole = (user: unknown, roles: Role[]) => {
  const u = user as { collection?: string; role?: Role } | null
  return !!u && u.collection === 'users' && roles.includes((u.role ?? 'editor') as Role)
}

/** Patron (Saïd) : seul à publier sur le canal Telegram et à gérer la rubrique Vie musulmane. */
export const isPatronUser = (user: unknown) => hasRole(user, ['patron'])
/** Compte de l’équipe avec les droits d’administration (patron compris ; jamais un compte public). */
export const isAdminUser = (user: unknown) => hasRole(user, ['patron', 'admin'])
export const isStaffUser = (user: unknown) => hasRole(user, ['patron', 'admin', 'editor'])
/** Conseiller d’accompagnement : voit seulement les demandes d’accompagnement (moindre privilège). */
export const isAdvisorUser = (user: unknown) => hasRole(user, ['conseiller'])

/** Agent IA authentifié par sa clé API (collection « agents »). */
export const isAgent = (user: unknown): user is { id: number; collection: 'agents'; slug: string; name: string } =>
  !!user && (user as { collection?: string }).collection === 'agents'

/** Compte public connecté (particulier ou professionnel). */
export const isMember = (user: unknown): user is { id: number; collection: 'members'; kind: 'particulier' | 'pro'; email: string } =>
  !!user && (user as { collection?: string }).collection === 'members'

export const isPatron: Access = ({ req: { user } }) => isPatronUser(user)
export const isAdmin: Access = ({ req: { user } }) => isAdminUser(user)
export const isStaff: Access = ({ req: { user } }) => isStaffUser(user)
/** Administration ou conseiller d’accompagnement. */
export const isAdminOrAdvisor: Access = ({ req: { user } }) => isAdminUser(user) || isAdvisorUser(user)
export const isAdminField: FieldAccess = ({ req: { user } }) => isAdminUser(user)
export const isPatronField: FieldAccess = ({ req: { user } }) => isPatronUser(user)

export const anyone: Access = () => true

/** Public : uniquement les documents publiés. Équipe : tout, brouillons compris. */
export const publishedOrStaff: Access = ({ req: { user } }) => {
  if (isStaffUser(user)) return true
  return { _status: { equals: 'published' } }
}

/** Nom lisible de l’auteur d’une action (journal d’audit, messages). */
export const actorOf = (user: unknown): { kind: 'humain' | 'agent' | 'membre' | 'systeme'; label: string; id?: number } => {
  const u = user as { collection?: string; id?: number; name?: string; email?: string } | null
  if (!u) return { kind: 'systeme', label: 'Système' }
  if (u.collection === 'users') return { kind: 'humain', label: u.name || u.email || 'Équipe', id: u.id }
  if (u.collection === 'agents') return { kind: 'agent', label: u.name || 'Agent', id: u.id }
  return { kind: 'membre', label: u.email || 'Membre', id: u.id }
}
