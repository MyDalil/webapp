import { createHash } from 'crypto'
import { sql } from '@payloadcms/db-postgres'

type Db = { drizzle: { execute: (q: unknown) => Promise<{ rows: Record<string, unknown>[] }> } }
type P = { db: unknown }

/** Empreinte d’une adresse : permet de relier les événements sans garder l’adresse en clair. */
export const recipientHash = (email: string) => createHash('sha256').update(`destinataire:${email.trim().toLowerCase()}`).digest('hex').slice(0, 24)

const exec = (p: P, q: unknown) => (p.db as Db).drizzle.execute(q)

/** Une clé déjà acceptée ou délivrée n’est jamais renvoyée (nouvel essai sans doublon). */
export async function alreadyAccepted(p: P, key: string) {
  const { rows } = await exec(p, sql`SELECT status FROM email_deliveries WHERE idempotency_key = ${key} AND status IN ('accepted', 'delivered', 'delayed')`)
  return rows.length > 0
}

export async function recordAttempt(p: P, r: { key: string; subject: string; to: string; ok: boolean; providerId?: string | null; error?: string | null }) {
  await exec(p, sql`
    INSERT INTO email_deliveries (idempotency_key, subject, recipient_hash, provider_id, status, attempts, error, updated_at, created_at)
    VALUES (${r.key}, ${r.subject.slice(0, 200)}, ${recipientHash(r.to)}, ${r.providerId ?? null}, ${r.ok ? 'accepted' : 'failed'}, 1, ${r.error ?? null}, now(), now())
    ON CONFLICT (idempotency_key) DO UPDATE SET attempts = email_deliveries.attempts + 1, status = EXCLUDED.status,
      provider_id = COALESCE(EXCLUDED.provider_id, email_deliveries.provider_id), error = EXCLUDED.error, updated_at = now()`)
}

const EVENT_STATUS: Record<string, string> = {
  'email.delivered': 'delivered',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
  'email.delivery_delayed': 'delayed',
  'email.failed': 'failed',
}

/** Événement du webhook Resend → état du suivi. Un état final (délivré, rebond, plainte) n’est jamais rétrogradé. */
export async function applyEvent(p: P, type: string, providerId: string) {
  const status = EVENT_STATUS[type]
  if (!status || !providerId) return false
  await exec(p, sql`UPDATE email_deliveries SET status = ${status}, updated_at = now()
    WHERE provider_id = ${providerId} AND (status NOT IN ('delivered', 'bounced', 'complained') OR ${status} IN ('bounced', 'complained'))`)
  return true
}
