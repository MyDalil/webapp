import 'server-only'
import { randomUUID } from 'crypto'
import { cookies } from 'next/headers'
import { payload } from '@/platform/http'

/**
 * Session visiteur (profil test du prototype) : favoris, listes, checklist, parcours.
 * Stockée dans Neon (collection visitor-sessions), cookie httpOnly 7 jours.
 */

const COOKIE = 'dalil_sid'
const TTL_DAYS = 7

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

const emptyState = (): State => ({ favorites: [], collections: [], items: [], checklist: {}, diagnostics: [], contacts: [], applications: [], seq: 0 })

/** Lit la session du visiteur (null si absente ou expirée). */
export async function readSession() {
  const sid = (await cookies()).get(COOKIE)?.value
  if (!sid) return null
  const p = await payload()
  const res = await p.find({ collection: 'visitor-sessions', where: { sid: { equals: sid } }, limit: 1, overrideAccess: true })
  const doc = res.docs[0]
  if (!doc || new Date(doc.expiresAt) < new Date()) return null
  return { id: doc.id, sid, profile: (doc.profile ?? null) as Record<string, unknown> | null, state: { ...emptyState(), ...((doc.state as State) ?? {}) } }
}

/** Crée la session si besoin (profil test) et pose le cookie. */
export async function ensureSession() {
  const existing = await readSession()
  if (existing) return existing
  const p = await payload()
  const sid = randomUUID()
  const expiresAt = new Date(Date.now() + TTL_DAYS * 864e5)
  const doc = await p.create({
    collection: 'visitor-sessions',
    data: { sid, expiresAt: expiresAt.toISOString(), profile: null, state: emptyState() },
    overrideAccess: true,
  })
  ;(await cookies()).set(COOKIE, sid, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', expires: expiresAt })
  return { id: doc.id, sid, profile: null as Record<string, unknown> | null, state: emptyState() }
}

export async function saveSession(id: number, patch: { profile?: Record<string, unknown> | null; state?: State }) {
  const p = await payload()
  await p.update({ collection: 'visitor-sessions', id, data: patch, overrideAccess: true })
}

export async function deleteSession() {
  const s = await readSession()
  if (s) {
    const p = await payload()
    await p.delete({ collection: 'visitor-sessions', id: s.id, overrideAccess: true })
  }
  ;(await cookies()).delete(COOKIE)
}

export const pathFor = (itemType: string, itemKey: string) =>
  itemType === 'guide' ? `/guides/${itemKey}` : itemType === 'listing' ? `/adresses/${itemKey}` : itemType === 'professional' ? `/professionnels/${itemKey}` : `/annuaire`

