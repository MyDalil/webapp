import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { deferred } from '@/platform/deferredData'
import { listRoles } from '@/modules/agents'

/**
 * Équipe d’agents (méthode ICM, décision de Rad du 14 nov. 2026) : 16 rôles lus dans company/.
 * 6 actifs (CEO, Rédacteur, Traducteur, Médiathèque, Modérateur, Support), 10 en réserve, activables en un clic.
 * Rôles déjà présents : jamais écrasés (mémoire, budgets, réglages gardés). Anciens rôles renommés :
 * editorial → redacteur, trust → moderateur.
 */
const RENAMED: Record<string, string> = { editorial: 'redacteur', trust: 'moderateur' }

export const up = deferred('20261114_140100_agents_equipe_icm', async ({ payload, req }: MigrateUpArgs): Promise<void> => {
  for (const [from, to] of Object.entries(RENAMED)) {
    const old = (await payload.find({ collection: 'agents', req, overrideAccess: true, depth: 0, limit: 1, where: { slug: { equals: from } } })).docs[0]
    const exists = (await payload.count({ collection: 'agents', req, overrideAccess: true, where: { slug: { equals: to } } })).totalDocs
    if (old && !exists) await payload.update({ collection: 'agents', id: old.id, req, overrideAccess: true, data: { slug: to } as never })
  }
  for (const r of await listRoles()) {
    const found = (await payload.find({ collection: 'agents', req, overrideAccess: true, depth: 0, limit: 1, where: { slug: { equals: r.id.slug } } })).docs[0]
    const ids = { roleId: r.id.agent_id, department: r.id.department }
    if (found) {
      await payload.update({ collection: 'agents', id: found.id, req, overrideAccess: true, data: ids as never })
      continue
    }
    await payload.create({
      collection: 'agents',
      req,
      overrideAccess: true,
      data: {
        ...ids,
        name: r.id.name,
        slug: r.id.slug,
        status: r.id.status,
        mission: r.agentMd.split('## Mission')[1]?.split('##')[0]?.trim() || r.id.name,
        provider: r.id.provider,
        model: r.id.model,
        maxStepsPerTask: r.guardrails.max_steps,
        tools: r.guardrails.tools,
      } as never,
    })
  }
})

export async function down(_args: MigrateDownArgs): Promise<void> {}
