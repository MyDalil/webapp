import 'server-only'
import { sql } from '@payloadcms/db-postgres'
import { TEAM, layout, send } from '@/platform/mail'
import { payload } from '@/platform/http'
import { AI_MODEL, PRICE_MICROS, aiConfigured, type AiReply } from './claude'

/** Garde-fous de l’IA : réservée aux comptes vérifiés, quota quotidien par compte, plafond mensuel global (décisions de Rad). */
export const DAILY_QUOTA = Number(process.env.AI_DAILY_QUOTA) || 20
export const MONTHLY_BUDGET_MICROS = (Number(process.env.AI_MONTHLY_BUDGET_USD) || 10) * 1_000_000
export const MAX_INPUT_CHARS = 600

type Db = { drizzle: { execute: (q: unknown) => Promise<{ rows: Record<string, unknown>[] }> } }
const db = async () => (await payload()).db as unknown as Db

export async function monthSpentMicros() {
  const { rows } = await (await db()).drizzle.execute(sql`SELECT COALESCE(SUM(cost_micros), 0)::bigint AS s FROM ai_usage WHERE created_at >= date_trunc('month', now())`)
  return Number(rows[0]?.s ?? 0)
}

async function usedToday(memberId: number) {
  const { rows } = await (await db()).drizzle.execute(
    sql`SELECT COUNT(*)::int AS n FROM ai_usage WHERE member_id = ${memberId} AND created_at >= (date_trunc('day', now() AT TIME ZONE 'Africa/Algiers') AT TIME ZONE 'Africa/Algiers')`,
  )
  return Number(rows[0]?.n ?? 0)
}

export type AiGate = { ok: true; remaining: number } | { ok: false; reason: 'account' | 'quota' | 'budget' | 'off' }

/** L’IA peut-elle être utilisée pour ce compte maintenant ? */
export async function aiGate(member: { id: number; _verified?: boolean | null } | null): Promise<AiGate> {
  if (!aiConfigured()) return { ok: false, reason: 'off' }
  if (!member?._verified) return { ok: false, reason: 'account' }
  const [today, spent] = await Promise.all([usedToday(member.id), monthSpentMicros()])
  if (spent >= MONTHLY_BUDGET_MICROS) return { ok: false, reason: 'budget' }
  if (today >= DAILY_QUOTA) return { ok: false, reason: 'quota' }
  return { ok: true, remaining: DAILY_QUOTA - today - 1 }
}

/** Enregistre un appel, puis prévient l’équipe une fois par mois quand 80 % du budget est atteint. */
export async function recordAi(feature: 'reformulate' | 'understand', memberId: number, r: AiReply) {
  const p = await payload()
  const costMicros = r.inputTokens * PRICE_MICROS.input + r.outputTokens * PRICE_MICROS.output
  await p.create({ collection: 'ai-usage', overrideAccess: true, data: { feature, member: memberId, inputTokens: r.inputTokens, outputTokens: r.outputTokens, costMicros, model: AI_MODEL } })
  const spent = await monthSpentMicros()
  if (spent < MONTHLY_BUDGET_MICROS * 0.8) return
  const month = new Date().toISOString().slice(0, 7)
  const { rows } = await (p.db as unknown as Db).drizzle.execute(sql`INSERT INTO ai_budget_alerts (month) VALUES (${month}) ON CONFLICT DO NOTHING RETURNING month`)
  if (!rows.length) return
  const usd = (n: number) => `${(n / 1_000_000).toFixed(2)} $`
  await send(
    process.env.AI_ALERT_EMAIL || TEAM,
    `IA DALIL : 80 % du budget mensuel atteint (${usd(spent)} / ${usd(MONTHLY_BUDGET_MICROS)})`,
    layout('Budget IA bientôt atteint.', `<p>La reformulation par l’IA a consommé ${usd(spent)} ce mois-ci, sur un plafond de ${usd(MONTHLY_BUDGET_MICROS)}.</p><p>Au plafond, DALIL passe automatiquement au nettoyage simple, sans coût. Pour relever le plafond : variable <code>AI_MONTHLY_BUDGET_USD</code> dans Vercel.</p>`),
  ).catch(() => {})
}
