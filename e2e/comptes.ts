import { createHmac } from 'node:crypto'
import { expect, type APIRequestContext } from '@playwright/test'
import { signIn } from './session'

/**
 * Comptes et outils communs aux parcours des nouvelles routes (MCP, OAuth, télécommande, import CSV).
 * Le premier compte (first-register) est administrateur : mêmes identifiants que les specs du cockpit.
 * La CI déclare une clé MCP de test pour ce compte (DALIL_MCP_KEYS) et la donne aux tests (E2E_MCP_KEY).
 */
export const ADMIN = { email: process.env.DALIL_ADMIN_EMAIL || 'salam@mydalil.com', password: 'Cockpit-test-2026!', name: 'Saïd Test' }
export const EDITEUR = { email: 'editeur.e2e@mydalil.com', password: 'Cockpit-test-2026!', name: 'Éditeur Test' }

/** Compte administrateur présent et session ouverte sur `r`. */
export async function ensureAdmin(r: APIRequestContext) {
  await r.post('/api/users/first-register', { data: ADMIN }) // sans effet si un compte existe déjà
  await signIn(r, ADMIN)
}

/** Identifiant d’un compte (session administrateur requise sur `r`), créé s’il manque. */
export async function ensureUser(r: APIRequestContext, who: { email: string; password: string; name: string }, data: Record<string, unknown>): Promise<number> {
  const find = async () => ((await (await r.get(`/api/users?where[email][equals]=${encodeURIComponent(who.email)}&limit=1&depth=0`)).json()) as { docs: { id: number }[] }).docs[0]
  let u = await find()
  if (!u) {
    await r.post('/api/users', { data: { ...who, ...data } })
    u = await find()
  }
  expect(u, `compte ${who.email}`).toBeTruthy()
  expect((await r.patch(`/api/users/${u.id}`, { data })).ok(), `mise à jour de ${who.email}`).toBe(true)
  return u.id
}

/** Appel JSON-RPC à un serveur MCP de DALIL. */
export const rpc = (r: APIRequestContext, path: string, body: unknown, token?: string) =>
  r.post(path, { headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...(token ? { authorization: `Bearer ${token}` } : {}) }, data: body as Record<string, unknown> })

let seq = 0
export const rpcId = () => ++seq

/** Bouton signé de la télécommande, calculé comme src/platform/telegram/callback.ts (secret de test de la CI). */
export function signedButton(op: string, ref: string): string | null {
  const key = process.env.REMOTE_SIGNING_SECRET?.trim() || process.env.PAYLOAD_SECRET?.trim() || ''
  if (!key) return null
  // Même format que src/platform/telegram/callback.ts : op.ref.horodatage(base 36).signature
  const body = `${op}.${ref}.${Math.floor(Date.now() / 1000).toString(36)}`
  return `${body}.${createHmac('sha256', key).update(body).digest('base64url').slice(0, 16)}`
}

/** Une seule passe pour les parcours d’API (pas de différence ordinateur / mobile, et limites de débit par adresse IP). */
export const apiOnly = (projectName: string) => projectName !== 'ordinateur'
