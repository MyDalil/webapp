import { sql } from '@payloadcms/db-postgres'
import { payload } from '@/platform/http'
import { recordError } from '@/platform/monitoring/errors'

type Db = { drizzle: { execute: (q: unknown) => Promise<{ rows: Record<string, unknown>[] }> } }
const exec = async (q: unknown) => ((await payload()).db as unknown as Db).drizzle.execute(q)

/** Jour d’Alger (AAAA-MM-JJ) : une exécution par tâche et par jour. */
export const algiersDay = (d = new Date()) => new Date(d.getTime() + 3600e3).toISOString().slice(0, 10)

/** Une tâche « en cours » depuis plus longtemps est considérée comme interrompue et peut être reprise. */
const STALE_MINUTES = 30

export type TaskOutcome = { status: 'succeeded' | 'failed' | 'skipped'; result?: unknown; error?: string; reason?: string }

/**
 * Exécute une tâche isolée : verrou + idempotence par (tâche, jour) dans `task_runs`.
 * - déjà réussie aujourd’hui → ignorée ; déjà en cours → ignorée (pas d’exécution concurrente) ;
 * - échec précédent ou exécution interrompue → reprise ;
 * - une erreur est enregistrée (état, durée, message), signalée au journal des erreurs, sans bloquer les autres tâches.
 * `failed(result)` permet à une tâche de déclarer un échec métier sans lever (ex. sauvegarde incomplète).
 */
export async function runTask(name: string, fn: () => Promise<unknown>, opts: { day?: string; failed?: (result: unknown) => string | null } = {}): Promise<TaskOutcome> {
  const day = opts.day ?? algiersDay()
  const key = `${name}:${day}`
  const { rows } = await exec(sql`
    INSERT INTO task_runs (key, name, day, status, started_at, attempts, updated_at, created_at)
    VALUES (${key}, ${name}, ${day}, 'running', now(), 1, now(), now())
    ON CONFLICT (key) DO UPDATE SET status = 'running', started_at = now(), finished_at = NULL, error = NULL,
      attempts = task_runs.attempts + 1, updated_at = now()
    WHERE task_runs.status = 'failed' OR (task_runs.status = 'running' AND task_runs.started_at < now() - make_interval(mins => ${STALE_MINUTES}))
    RETURNING id`)
  if (!rows.length) return { status: 'skipped', reason: 'déjà exécutée aujourd’hui ou en cours' }
  const id = rows[0].id
  const started = Date.now()
  try {
    const result = await fn()
    const problem = opts.failed?.(result) ?? null
    const status = problem ? 'failed' : 'succeeded'
    await exec(sql`UPDATE task_runs SET status = ${status}, finished_at = now(), duration_ms = ${Date.now() - started}, result = ${JSON.stringify(result ?? null)}::jsonb, error = ${problem}, updated_at = now() WHERE id = ${id}`)
    if (problem) await recordError(new Error(`Tâche ${name} en échec : ${problem}`), { route: `/api/taches#${name}`, routeType: 'tache' })
    return problem ? { status, result, error: problem } : { status, result }
  } catch (e) {
    const message = (e instanceof Error ? e.message : String(e)).slice(0, 1000)
    await exec(sql`UPDATE task_runs SET status = 'failed', finished_at = now(), duration_ms = ${Date.now() - started}, error = ${message}, updated_at = now() WHERE id = ${id}`).catch(() => {})
    await recordError(new Error(`Tâche ${name} en échec : ${message}`), { route: `/api/taches#${name}`, routeType: 'tache' })
    return { status: 'failed', error: message }
  }
}

/** Dernière exécution réussie d’une tâche (battement de cœur pour /api/sante et la surveillance). */
export async function lastSuccess(name: string): Promise<{ at: string; result: unknown } | null> {
  const { rows } = await exec(sql`SELECT finished_at, result FROM task_runs WHERE name = ${name} AND status = 'succeeded' ORDER BY finished_at DESC LIMIT 1`)
  return rows[0] ? { at: new Date(String(rows[0].finished_at)).toISOString(), result: rows[0].result } : null
}
