import 'server-only'
import { createHash } from 'crypto'
import { NextResponse } from 'next/server'
import { payload } from '@/platform/http'
import { hit, peek } from '@/platform/security/rateLimit'
import { SITE } from '@/platform/site'
import { makeConfig, protectedResourceMetadata, type AuthorizeParams, type OAuthConfig, type UserRecord } from './core'

/**
 * Secret OAuth. Production (VERCEL_ENV=production) : OAUTH_SECRET obligatoire (32 caractères au moins), jamais de repli ;
 * sans lui, OAuth est désactivé (503 clair) et une alerte est enregistrée. Preview et local : OAUTH_SECRET, sinon
 * PAYLOAD_SECRET, sinon dérivé de l’URL de base (même logique que payload.config.ts).
 */
export const MIN_OAUTH_SECRET = 32
export function oauthSecret(env: Record<string, string | undefined> = process.env): { secret: string; error?: string } {
  const dedicated = env.OAUTH_SECRET?.trim() ?? ''
  if (env.VERCEL_ENV === 'production')
    return dedicated.length >= MIN_OAUTH_SECRET ? { secret: dedicated } : { secret: '', error: 'OAUTH_SECRET absent ou trop court (32 caractères au moins) en production : OAuth désactivé.' }
  const db = env.DALIL_DATABASE_URL || env.DATABASE_URL || env.POSTGRES_URL || ''
  return { secret: dedicated || env.PAYLOAD_SECRET?.trim() || (db ? createHash('sha256').update(`dalil:${db}`).digest('hex') : '') }
}

/**
 * Configuration OAuth du serveur. OAUTH_KEY_VERSION (défaut « 1 ») : la changer invalide tous les clients et jetons.
 * Sans secret valable, OAuth est désactivé (null).
 */
let cached: OAuthConfig | null | undefined
let disabledReason = 'OAuth non configuré.'
export function oauthConfig(): OAuthConfig | null {
  if (cached !== undefined) return cached
  const { secret, error } = oauthSecret()
  if (error) {
    disabledReason = error
    console.error(`[oauth] ${error}`)
    void import('@/platform/monitoring/errors').then((m) => m.recordError(new Error(error), { route: 'oauth', routeType: 'config' })).catch(() => {})
  }
  cached = error ? null : makeConfig(secret, (process.env.OAUTH_KEY_VERSION || '1').trim(), SITE)
  return cached
}

/** Compte équipe avec l’empreinte du mot de passe (champ caché) ; null s’il n’existe pas. */
export async function loadUser(id: number): Promise<UserRecord | null> {
  try {
    const p = await payload()
    const u = await p.findByID({ collection: 'users', id, depth: 0, overrideAccess: true, showHiddenFields: true })
    return (u as unknown as UserRecord) ?? null
  } catch {
    return null
  }
}

/** Usage unique d’un code ou d’un jeton de rafraîchissement (compteur dans la table rate_limits, sans nouvelle table). */
export async function consumeOnce(kind: 'code' | 'refresh', jti: string, ttlSec: number) {
  return (await hit(`oauth-${kind}`, jti, 1, ttlSec)) === 0
}

/** Famille de jetons compromise (jeton de rafraîchissement ou code réutilisé) : marquée pour la durée du rafraîchissement. */
export async function revokeFamily(fam: string, ttlSec: number) {
  await hit('oauth-fam', fam, 0, ttlSec)
}

/** Lecture sans effet de bord : la famille est-elle révoquée ? */
export async function familyRevoked(fam: string) {
  return (await peek('oauth-fam', fam)) > 0
}

const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type, authorization, mcp-protocol-version' }

/** Réponse JSON OAuth : jamais en cache, CORS ouvert (aucun cookie n’est lu par ces routes). */
export const oauthJson = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  NextResponse.json(body, { status, headers: { 'cache-control': 'no-store', pragma: 'no-cache', ...CORS, ...extra } })

export const preflight = () => new NextResponse(null, { status: 204, headers: { ...CORS, 'access-control-max-age': '86400' } })

export const disabled = () => oauthJson({ error: 'temporarily_unavailable', error_description: disabledReason }, 503)

/** Paramètres d’un formulaire (x-www-form-urlencoded) ou d’un corps JSON, limités en taille. */
export async function readParams(req: Request): Promise<AuthorizeParams | null> {
  const text = await req.text()
  if (text.length > 16_384) return null
  const type = req.headers.get('content-type') ?? ''
  const out: AuthorizeParams = {}
  if (type.includes('application/json')) {
    try {
      const o = JSON.parse(text) as Record<string, unknown>
      for (const [k, v] of Object.entries(o)) if (typeof v === 'string') out[k] = v
    } catch {
      return null
    }
  } else for (const [k, v] of new URLSearchParams(text)) out[k] = v
  // Client public envoyé en Basic (secret vide) : on lit seulement l’identifiant.
  const auth = req.headers.get('authorization') ?? ''
  if (!out.client_id && auth.startsWith('Basic ')) {
    try {
      out.client_id = decodeURIComponent(Buffer.from(auth.slice(6), 'base64').toString('utf8').split(':')[0])
    } catch {
      /* ignoré */
    }
  }
  return out
}

/** Adresse des métadonnées de la ressource protégée (RFC 9728, chemin inséré) : seule source, utilisée par l’en-tête 401. */
export const resourceMetadataUrl = (cfg: OAuthConfig) => `${cfg.issuer}/.well-known/oauth-protected-resource/api/mcp/admin`

/** En-tête WWW-Authenticate du serveur MCP admin (401). OAuth désactivé : clé API seulement, sans métadonnées. */
export const wwwAuthenticate = (cfg: OAuthConfig | null) => (cfg ? `Bearer realm="DALIL", resource_metadata="${resourceMetadataUrl(cfg)}"` : 'Bearer realm="DALIL"')

/** Réponse des deux routes .well-known/oauth-protected-resource (même contenu, même source). */
export function protectedResourceResponse() {
  const cfg = oauthConfig()
  return cfg ? oauthJson(protectedResourceMetadata(cfg)) : disabled()
}
