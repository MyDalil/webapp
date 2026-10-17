import 'server-only'
import { cookies } from 'next/headers'
import { payload } from '@/platform/http'
import { currentMember } from './member'

/**
 * Espace personnel du membre connecté : profil (ville, intérêts), favoris, listes, préparation, parcours, demandes.
 * Rattaché au compte (champ `space` de `members`) — plus de profil test ni de session visiteur (décision de Rad, 2026-10-17).
 * Sans compte connecté : null, et l’interface propose la connexion ou l’inscription.
 */

const OLD_COOKIE = 'dalil_sid'

export type Favorite = { id: number; itemType: string; itemKey: string; label: string; path: string }
export type State = {
  favorites: Favorite[]
  collections: { id: number; name: string }[]
  items: { collectionId: number; favoriteId: number }[]
  checklist: Record<string, boolean>
  diagnostics: { answers: unknown; createdAt: string }[]
  contacts: { professionalSlug: string; message: string; createdAt: string }[]
  applications: Record<string, unknown>[]
  seq: number
}
export type Profile = { nickname: string; territory: string; interest: string }
type Space = { profile?: Partial<Profile>; state?: Partial<State> }

const emptyState = (): State => ({ favorites: [], collections: [], items: [], checklist: {}, diagnostics: [], contacts: [], applications: [], seq: 0 })

/** Bornes pour qu’un compte ne grossisse pas sans limite. */
const capped = (s: State): State => ({
  ...s,
  favorites: s.favorites.slice(-500),
  collections: s.collections.slice(-50),
  items: s.items.slice(-2000),
  diagnostics: s.diagnostics.slice(0, 20),
  contacts: s.contacts.slice(0, 100),
  applications: s.applications.slice(0, 50),
})

/** Espace du membre connecté (null sans compte connecté). `id` = identifiant du membre. */
export async function readSession() {
  const m = await currentMember()
  if (!m) return null
  const space = ((m as { space?: Space }).space ?? {}) as Space
  const profile: Profile = { nickname: m.firstName, territory: String(space.profile?.territory ?? ''), interest: String(space.profile?.interest ?? '') }
  return { id: m.id, sid: `member:${m.id}`, profile, state: { ...emptyState(), ...(space.state ?? {}) } as State }
}

/** Même chose : il n’y a plus de profil anonyme à créer. */
export const ensureSession = readSession

export async function saveSession(id: number, patch: { profile?: Partial<Profile> | null; state?: State }) {
  const p = await payload()
  const doc = await p.findByID({ collection: 'members', id, depth: 0, overrideAccess: true })
  const space = ((doc as { space?: Space }).space ?? {}) as Space
  const next: Space = {
    profile: patch.profile ? { territory: patch.profile.territory ?? '', interest: patch.profile.interest ?? '' } : space.profile,
    state: patch.state ? capped(patch.state) : space.state,
  }
  await p.update({ collection: 'members', id, data: { space: next } as never, overrideAccess: true, context: { spaceOnly: true } })
}

/** Ancien cookie du profil test : simplement retiré. */
export async function deleteSession() {
  ;(await cookies()).delete(OLD_COOKIE)
}

export const pathFor = (itemType: string, itemKey: string) =>
  itemType === 'guide' ? `/guides/${itemKey}` : itemType === 'listing' ? `/adresses/${itemKey}` : itemType === 'professional' ? `/professionnels/${itemKey}` : `/annuaire`
