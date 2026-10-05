import 'server-only'
import { randomUUID } from 'crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

/**
 * Couche de compatibilité : reproduit les routes /api du prototype DALIL
 * (newsletter, contributions, candidatures, profil test, favoris, listes, checklist)
 * en stockant tout dans Neon via Payload.
 */

export const payload = () => getPayload({ config })

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

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'cache-control': 'no-store' } })
export const fail = (error: string, status = 400) => json({ error }, status)

export const isEmail = (v: unknown): v is string => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())
export const clean = (v: unknown, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

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

export async function record(kind: 'contribution' | 'application' | 'contact' | 'feedback' | 'diagnostic', subject: string, data: unknown, email?: string, session?: string) {
  const p = await payload()
  await p.create({
    collection: 'submissions',
    data: { kind, status: 'new', subject: subject.slice(0, 200) || kind, data: data as never, email: email || undefined, session },
    overrideAccess: true,
  })
}
