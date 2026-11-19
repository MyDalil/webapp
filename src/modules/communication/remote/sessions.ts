import type { Payload } from 'payload'
import type { RemoteChannel } from './core'

/**
 * État des parcours visiteurs du bot (collection `bot-sessions`, créée par le lot K : channel, chatId, step, data, expiresAt ;
 * unique (channel, chatId) ; accès serveur seulement). Expiration 30 min, prolongée à chaque étape.
 * Une session expirée est supprimée à la lecture suivante, et les sessions expirées des autres sont purgées
 * quand une nouvelle session est créée. Aucune écriture si l’état ne change pas.
 */
export type SessionState = { step: string; data: Record<string, unknown> }
export type SessionStore = {
  get: (channel: RemoteChannel, chatId: string) => Promise<SessionState | null>
  set: (channel: RemoteChannel, chatId: string, state: SessionState) => Promise<void>
  clear: (channel: RemoteChannel, chatId: string) => Promise<void>
}

export const SESSION_TTL_MS = 30 * 60 * 1000
const SLUG = 'bot-sessions' as const
type Row = { id: number | string; step?: string | null; data?: unknown; expiresAt?: string | null }
const same = (a: SessionState, b: SessionState) => a.step === b.step && JSON.stringify(a.data) === JSON.stringify(b.data)

/** Stockage Payload (`bot-sessions`, collection déclarée par le lot K). */
export function payloadSessions(payload: Payload): SessionStore {
  const cache = new Map<string, { row: Row | null; state: SessionState | null }>()
  const k = (c: string, id: string) => `${c}:${id}`
  const load = async (channel: RemoteChannel, chatId: string) => {
    const hit = cache.get(k(channel, chatId))
    if (hit) return hit
    const r = await payload.find({ collection: SLUG, where: { and: [{ channel: { equals: channel } }, { chatId: { equals: chatId } }] }, limit: 1, depth: 0, overrideAccess: true })
    let row = (r.docs[0] as unknown as Row | undefined) ?? null
    let state: SessionState | null = null
    if (row && (!row.expiresAt || Date.parse(row.expiresAt) <= Date.now())) {
      await payload.delete({ collection: SLUG, id: row.id, overrideAccess: true }).catch(() => null)
      row = null
    } else if (row) state = { step: String(row.step ?? ''), data: row.data && typeof row.data === 'object' ? (row.data as Record<string, unknown>) : {} }
    const v = { row, state }
    cache.set(k(channel, chatId), v)
    return v
  }
  return {
    get: async (channel, chatId) => (await load(channel, chatId)).state,
    async set(channel, chatId, state) {
      const cur = await load(channel, chatId)
      if (cur.state && same(cur.state, state)) return
      const data = { channel, chatId, step: state.step, data: state.data, expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString() }
      if (cur.row) {
        await payload.update({ collection: SLUG, id: cur.row.id, data, overrideAccess: true, depth: 0 })
      } else {
        // Nouvelle session : on purge au passage les sessions expirées (nettoyage sans tâche dédiée).
        await payload.delete({ collection: SLUG, where: { expiresAt: { less_than: new Date().toISOString() } }, overrideAccess: true }).catch(() => null)
        const row = (await payload.create({ collection: SLUG, data, overrideAccess: true, depth: 0 })) as unknown as Row
        cur.row = row
      }
      cur.state = state
    },
    async clear(channel, chatId) {
      const cur = await load(channel, chatId)
      if (!cur.row) return
      await payload.delete({ collection: SLUG, id: cur.row.id, overrideAccess: true }).catch(() => null)
      cur.row = null
      cur.state = null
    },
  }
}

/** Stockage en mémoire (tests), même contrat ; compte les écritures. */
export function memorySessions(now = () => Date.now()): SessionStore & { writes: number; rows: Map<string, SessionState & { expiresAt: number }> } {
  const rows = new Map<string, SessionState & { expiresAt: number }>()
  const store = {
    rows,
    writes: 0,
    async get(c: RemoteChannel, id: string) {
      const r = rows.get(`${c}:${id}`)
      if (!r) return null
      if (r.expiresAt <= now()) { rows.delete(`${c}:${id}`); store.writes++; return null }
      return { step: r.step, data: r.data }
    },
    async set(c: RemoteChannel, id: string, s: SessionState) {
      const r = rows.get(`${c}:${id}`)
      if (r && r.expiresAt > now() && same(r, s)) return
      rows.set(`${c}:${id}`, { ...s, expiresAt: now() + SESSION_TTL_MS })
      store.writes++
    },
    async clear(c: RemoteChannel, id: string) {
      if (rows.delete(`${c}:${id}`)) store.writes++
    },
  }
  return store
}
