import 'server-only'
import { createHash } from 'crypto'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { sql } from '@payloadcms/db-postgres'
import { payload } from '@/platform/http'

/**
 * Limitation de débit native (table `rate_limits` dans Neon, aucun service tiers).
 * Fenêtre fixe par clé ; l’adresse IP n’est jamais stockée en clair (empreinte salée).
 */
type Db = { drizzle: { execute: (q: unknown) => Promise<{ rows: Record<string, unknown>[] }> } }

const fingerprint = (v: string) => createHash('sha256').update(`${process.env.PAYLOAD_SECRET ?? ''}:${v}`).digest('hex').slice(0, 32)

/** Empreinte de l’adresse IP du visiteur (derrière le proxy Vercel). */
export async function clientId() {
  const h = await headers()
  const ip = (h.get('x-forwarded-for') ?? '').split(',')[0].trim() || h.get('x-real-ip') || 'inconnu'
  return `ip:${fingerprint(ip)}`
}

/** Compte un essai ; renvoie le délai d’attente en secondes si la limite est dépassée, sinon 0. */
export async function hit(bucket: string, who: string, max: number, windowSec: number): Promise<number> {
  const p = await payload()
  const key = `${bucket}:${who.startsWith('ip:') ? who : fingerprint(who)}`
  const { rows } = await (p.db as unknown as Db).drizzle.execute(sql`
    INSERT INTO rate_limits (key, count, reset_at) VALUES (${key}, 1, now() + make_interval(secs => ${windowSec}))
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.reset_at < now() THEN 1 ELSE rate_limits.count + 1 END,
      reset_at = CASE WHEN rate_limits.reset_at < now() THEN now() + make_interval(secs => ${windowSec}) ELSE rate_limits.reset_at END
    RETURNING count, GREATEST(1, CEIL(EXTRACT(EPOCH FROM (reset_at - now()))))::int AS retry`)
  const row = rows[0] ?? {}
  return Number(row.count) > max ? Number(row.retry) || windowSec : 0
}

export const tooMany = (retryAfter: number) =>
  NextResponse.json(
    { error: `Trop de tentatives. Réessayez dans ${retryAfter < 120 ? `${retryAfter} secondes` : `${Math.ceil(retryAfter / 60)} minutes`}.` },
    { status: 429, headers: { 'retry-after': String(retryAfter), 'cache-control': 'no-store' } },
  )

/** Raccourci : limite par adresse IP (et éventuellement par compte ou email), réponse 429 prête à renvoyer. */
export async function guard(bucket: string, max: number, windowSec: number, extra?: string) {
  const waits = await Promise.all([hit(bucket, await clientId(), max, windowSec), extra ? hit(`${bucket}:x`, extra, max, windowSec) : 0])
  const wait = Math.max(...waits)
  return wait ? tooMany(wait) : null
}

/** Ménage quotidien des compteurs expirés. */
export async function purgeRateLimits() {
  const p = await payload()
  await (p.db as unknown as Db).drizzle.execute(sql`DELETE FROM rate_limits WHERE reset_at < now() - interval '1 day'`)
}
