import type { Access, CollectionBeforeChangeHook, CollectionBeforeOperationHook, FieldAccess } from 'payload'
import { APIError } from 'payload'

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
/** Champ interne (notes, pièces, compte propriétaire) : équipe seulement, jamais renvoyé par les API publiques. */
export const isStaffField: FieldAccess = ({ req: { user } }) => isStaffUser(user)
/**
 * Coordonnées d’une fiche : à tous si `showContacts` est coché, sinon aux comptes connectés et à l’équipe.
 * La règle vit dans le serveur : REST, GraphQL et pages appliquent la même décision.
 */
export const contactField: FieldAccess = ({ req: { user }, doc, siblingData }) =>
  isStaffUser(user) || isMember(user) || Boolean((doc as { showContacts?: boolean } | undefined)?.showContacts ?? (siblingData as { showContacts?: boolean } | undefined)?.showContacts)

/**
 * Rédacteur : prépare, ne publie pas (règle des rôles). Refus côté serveur, quel que soit le bouton ou la route.
 * Les traitements sans compte (migrations, imports, tâches) ne sont pas concernés : ils n’ont pas d’utilisateur.
 */
export function mayPublish(user: unknown) {
  return !user || isAdminUser(user)
}

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

/**
 * Garde de publication (A02) : seul un administrateur publie.
 * - collections à brouillons : `_status: published` refusé au rédacteur et aux agents ;
 * - collections à statut : passage à `published` refusé, la fiche déjà publiée reste modifiable sans republier.
 */
export const guardPublication =
  (field: '_status' | 'status' = '_status'): CollectionBeforeChangeHook =>
  ({ data, originalDoc, req }) => {
    if (mayPublish(req.user)) return data
    const next = data?.[field]
    const before = (originalDoc as Record<string, unknown> | undefined)?.[field]
    const publishing = field === '_status' ? next === 'published' : next === 'published' && before !== 'published'
    if (publishing) throw new APIError('Publication réservée à un administrateur. Enregistrez un brouillon : il sera relu puis publié.', 403, null, true)
    return data
  }

/**
 * Brouillon en attente sur une fiche publiée : une mise à jour technique (import, tâche, script : `_status` absent,
 * pas de brouillon) part de la version publiée, pas du brouillon. Sans cette garde, Payload repart de la dernière
 * version (le brouillon du rédacteur) : la fiche serait dépubliée et le brouillon non relu mis en ligne.
 * Le brouillon reste dans l’historique des versions. `markTechnicalUpdate` (beforeOperation) repère ces mises à jour.
 */
export const markTechnicalUpdate: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  const a = args as { draft?: boolean; data?: Record<string, unknown> }
  if (operation === 'update' || operation === 'updateByID') req.context = { ...req.context, technicalUpdate: !a.draft && !!a.data && a.data._status === undefined ? Object.keys(a.data ?? {}) : false }
  return args
}

export const keepPublishedBase: CollectionBeforeChangeHook = async ({ collection, data, operation, originalDoc, req }) => {
  if (operation !== 'update' || !data || !req.context?.technicalUpdate || originalDoc?._status !== 'draft' || !originalDoc?.id) return data
  const main = (await req.payload.db.findOne({ collection: collection.slug, where: { id: { equals: originalDoc.id } }, req })) as Record<string, unknown> | null
  if (main?._status !== 'published') return data
  const submitted = new Set(req.context.technicalUpdate as string[])
  const { id: _id, createdAt: _c, updatedAt: _u, ...published } = main
  const kept = Object.fromEntries(Object.entries(published).filter(([k]) => !submitted.has(k)))
  return { ...data, ...kept, _status: 'published' }
}
