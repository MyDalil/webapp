import { sql, type MigrateUpArgs } from '@payloadcms/db-postgres'
import { createLocalReq, type Payload } from 'payload'

/**
 * Migrations de données différées.
 * Une migration de données écrit avec le schéma Payload ACTUEL (toutes les colonnes d’aujourd’hui).
 * Sur une base qui rattrape plusieurs migrations d’un coup (production à la fusion, base neuve, CI),
 * elle tournerait avant les colonnes ajoutées plus tard → échec du build.
 * Elle est donc seulement notée pendant `payload migrate`, puis exécutée par `flushDeferredData`
 * une fois tout le schéma en place (`scripts/flush-deferred.ts`, lancé par `vercel-build` et la CI).
 */
type Step = (args: MigrateUpArgs) => Promise<void>
type Db = { execute: (q: ReturnType<typeof sql>) => Promise<{ rows: Record<string, unknown>[] }> }

const TABLE = sql`CREATE TABLE IF NOT EXISTS dalil_deferred_data (name varchar PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now())`
const steps = new Map<string, Step>()

/** Enveloppe le `up` d’une migration de données : l’étape est enregistrée, pas exécutée. */
export function deferred(name: string, step: Step): Step {
  steps.set(name, step)
  return async ({ db }) => {
    await (db as unknown as Db).execute(TABLE)
    await (db as unknown as Db).execute(sql`INSERT INTO dalil_deferred_data (name) VALUES (${name}) ON CONFLICT DO NOTHING`)
  }
}

/** Exécute les étapes en attente, dans l’ordre des migrations ; une étape réussie est retirée de la file. */
export async function flushDeferredData(payload: Payload): Promise<string[]> {
  const db = (payload.db as unknown as { drizzle: Db }).drizzle
  await db.execute(TABLE)
  const { rows } = await db.execute(sql`SELECT name FROM dalil_deferred_data ORDER BY name`)
  const done: string[] = []
  for (const { name } of rows as { name: string }[]) {
    const step = steps.get(name)
    if (!step) throw new Error(`Migration de données différée inconnue : ${name}`)
    payload.logger.info(`Données différées : ${name}`)
    const req = await createLocalReq({}, payload)
    await step({ db: db as never, payload, req } as MigrateUpArgs)
    await db.execute(sql`DELETE FROM dalil_deferred_data WHERE name = ${name}`)
    done.push(name)
  }
  return done
}
