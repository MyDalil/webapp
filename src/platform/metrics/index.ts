import 'server-only'
import { sql } from '@payloadcms/db-postgres'
import { payload } from '@/platform/http'
import { METRIC_COLUMN, isMetricCollection, isMetricId, totalsOf, type MetricKind, type MetricTarget, type MetricTotals } from './core'

/**
 * Mesure d’audience des fiches (table `metrics_daily`, collection créée par le lot K dans Metrics.ts).
 * Une seule ligne par jour (heure d’Alger) et par fiche : chaque évènement incrémente un compteur, jamais une ligne par visiteur.
 */
export { METRIC_COLLECTIONS, METRIC_KINDS, BEACON_KINDS, parseBeacon, isBot, memoryLimiter, visibilityText, type MetricKind, type MetricTarget, type MetricTotals } from './core'

type Db = { drizzle: { execute: (q: unknown) => Promise<{ rows: Record<string, unknown>[] }> } }
const db = async () => (await payload()).db as unknown as Db

/** Jour d’Alger, stocké à minuit UTC (champ date de Payload). */
const TODAY = sql`((now() AT TIME ZONE 'Africa/Algiers')::date)::timestamp AT TIME ZONE 'UTC'`

/** CONTRAT (lot M) : +1 sur le compteur du jour de la fiche. Ne lève jamais d’erreur (la mesure ne bloque pas la page). */
export async function countEvent(target: MetricTarget, kind: MetricKind): Promise<void> {
  const col = METRIC_COLUMN[kind]
  if (!col || !isMetricCollection(target.collection) || !isMetricId(String(target.id))) return
  const c = sql.raw(col)
  try {
    await (await db()).drizzle.execute(sql`
      INSERT INTO metrics_daily (day, target_collection, target_id, ${c}) VALUES (${TODAY}, ${target.collection}, ${String(target.id)}, 1)
      ON CONFLICT (day, target_collection, target_id) DO UPDATE SET ${c} = COALESCE(metrics_daily.${c}, 0) + 1, updated_at = now()`)
  } catch {
    /* mesure perdue : jamais bloquant */
  }
}

/** Totaux d’une fiche sur les `days` derniers jours (aujourd’hui compris). */
export async function metricsTotals(target: MetricTarget, days: number): Promise<MetricTotals> {
  const d = Math.max(1, Math.min(366, Math.floor(days)))
  const { rows } = await (await db()).drizzle.execute(sql`
    SELECT COALESCE(SUM(views),0)::int AS views, COALESCE(SUM(calls),0)::int AS calls, COALESCE(SUM(whatsapp),0)::int AS whatsapp,
           COALESCE(SUM(directions),0)::int AS directions, COALESCE(SUM(shares),0)::int AS shares, COALESCE(SUM(leads),0)::int AS leads
    FROM metrics_daily
    WHERE target_collection = ${target.collection} AND target_id = ${String(target.id)} AND day >= ${TODAY} - make_interval(days => ${d - 1})`)
  return totalsOf(rows[0])
}
