import { sql } from '@payloadcms/db-postgres'
import { payload } from '@/platform/http'

export const dynamic = 'force-dynamic'

type Db = { drizzle: { execute: (q: unknown) => Promise<{ rows: Record<string, unknown>[] }> } }

/**
 * État du site pour la surveillance (.github/workflows/surveillance.yml) : application + base Neon.
 * 200 si tout répond, 503 sinon. Aucune donnée personnelle.
 * `?simuler-erreur=1` lève une erreur, seulement si DALIL_TEST_ERRORS=1 (CI) : vérifie le journal des erreurs.
 */
export async function GET(req: Request) {
  if (process.env.DALIL_TEST_ERRORS === '1' && new URL(req.url).searchParams.get('simuler-erreur') === '1') throw new Error('Erreur simulée pour le test du journal')
  const started = Date.now()
  try {
    const p = await payload()
    await (p.db as unknown as Db).drizzle.execute(sql`SELECT 1`)
    return Response.json({ ok: true, base: 'ok', ms: Date.now() - started, version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null }, { headers: { 'cache-control': 'no-store' } })
  } catch {
    return Response.json({ ok: false, base: 'indisponible', ms: Date.now() - started }, { status: 503, headers: { 'cache-control': 'no-store' } })
  }
}
