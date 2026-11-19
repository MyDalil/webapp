import 'server-only'
import { createLocalReq, type Payload } from 'payload'
import type { ActionContext, ActionDef } from '@/platform/actions/types'
import { ActionError } from '@/platform/actions'
import { payload } from '@/platform/http'
import { getControls, type KillSwitch } from './Controls'
import { killSwitchUpdate, siteState, type StateInput } from './state'

/**
 * Actions de l’arrêt général (global « Commandes et sécurité ») : état, arrêt, relance.
 * Mêmes règles que /admin : lecture équipe, écriture administrateur ; sur Telegram et WhatsApp, l’écriture
 * passe seulement après le bouton Confirmer signé (ctx.confirmed, vérifié par l’exécuteur commun).
 * « Tout couper » reste dans /admin : depuis un canal distant, il couperait la télécommande elle-même.
 */
type Db = { drizzle: { execute: (q: unknown) => Promise<{ rows: Record<string, unknown>[] }> } }

async function gather(p: Payload): Promise<StateInput> {
  const safe = async <T,>(f: () => Promise<T>): Promise<T | null> => {
    try {
      return await f()
    } catch {
      return null
    }
  }
  const since = new Date(Date.now() - 24 * 3600_000).toISOString()
  const [controls, spent, backup, errors] = await Promise.all([
    getControls(p),
    safe(async () => {
      const { sql } = await import('@payloadcms/db-postgres')
      const { rows } = await (p.db as unknown as Db).drizzle.execute(sql`SELECT COALESCE(SUM(cost_micros), 0)::bigint AS s FROM ai_usage WHERE created_at >= date_trunc('month', now())`)
      return Number(rows[0]?.s ?? 0)
    }),
    safe(async () => {
      const r = await p.find({ collection: 'task-runs' as never, where: { and: [{ name: { equals: 'sauvegarde' } }, { status: { equals: 'succeeded' } }] } as never, sort: '-startedAt', limit: 1, depth: 0, overrideAccess: true })
      return ((r.docs[0] as unknown as { finishedAt?: string } | undefined)?.finishedAt ?? null) as string | null
    }),
    safe(async () => {
      const r = await p.find({ collection: 'error-logs' as never, where: { and: [{ lastSeen: { greater_than: since } }, { resolved: { not_equals: true } }] } as never, sort: '-lastSeen', limit: 3, depth: 0, overrideAccess: true })
      return { total: r.totalDocs, last: (r.docs as unknown as { message: string }[]).map((d) => d.message.slice(0, 120)) }
    }),
  ])
  return { controls, aiConfigured: Boolean(process.env.ANTHROPIC_API_KEY), aiSpentMicros: spent, aiBudgetUsd: Number(process.env.AI_MONTHLY_BUDGET_USD) || 10, lastBackup: backup, errors }
}

/** Requête Payload au nom du compte (le crochet des Commandes horodate et note qui a déclenché). */
async function staffReq(p: Payload, ctx: ActionContext) {
  if (ctx.principal.kind !== 'staff') throw new ActionError('forbidden', 'Réservé à un administrateur.')
  const user = await p.findByID({ collection: 'users', id: ctx.principal.userId, depth: 0, overrideAccess: true })
  return createLocalReq({ user: { ...user, collection: 'users' } as never, context: { channel: ctx.channel, actionId: ctx.actionId } }, p)
}

/** Le patron (Saïd) a priorité : un arrêt qu’il a déclenché ne peut être levé que par un compte patron. */
async function stoppedByPatron(p: Payload, by: string | null | undefined) {
  if (!by) return false
  const r = await p.find({ collection: 'users', where: { and: [{ name: { equals: by } }, { role: { equals: 'patron' } }] } as never, limit: 1, depth: 0, overrideAccess: true })
  return r.docs.length > 0
}

export const controlActions: ActionDef[] = [
  {
    name: 'etat_du_site',
    title: 'État du site',
    description: 'Résumé de l’arrêt général et des commandes (agents, Telegram, maintenance), de l’IA (clé, dépense du mois, budget), de la dernière sauvegarde réussie et des erreurs des dernières 24 h. Lecture seule, aucune valeur secrète.',
    module: 'platform',
    access: 'staff',
    readOnly: true,
    input: { type: 'object', properties: {} },
    run: async () => siteState(await gather(await payload())),
  },
  {
    name: 'arreter_le_site',
    title: 'Arrêt général',
    description: 'Déclenche l’arrêt général des agents : « drain » = finir l’étape en cours puis arrêter (défaut), « stop » = arrêter à l’étape suivante. « Tout couper » se fait dans /admin. Réservé patron et admin ; à distance, confirmation par bouton signé.',
    module: 'platform',
    access: 'admin',
    readOnly: false,
    input: {
      type: 'object',
      properties: {
        raison: { type: 'string', maxLength: 300, description: 'Raison de l’arrêt (facultatif).' },
        mode: { type: 'string', enum: ['drain', 'stop'], default: 'drain' },
      },
    },
    run: async (input: { mode?: Exclude<KillSwitch, 'off' | 'cut'>; raison?: string }, ctx) => {
      const p = await payload()
      const before = await getControls(p)
      const data = killSwitchUpdate(before.killSwitch, input.mode ?? 'drain', input.raison || `Demandé par ${ctx.principal.kind === 'staff' ? ctx.principal.name : 'inconnu'} (${ctx.channel})`)
      if (!data) return { summary: `Arrêt général déjà actif (${before.killSwitch}).`, before: before.killSwitch, after: before.killSwitch }
      await p.updateGlobal({ slug: 'controls', data: data as never, req: await staffReq(p, ctx), overrideAccess: false, depth: 0 })
      return { summary: `Arrêt général : ${data.killSwitch === 'drain' ? 'finir puis arrêter' : 'arrêter maintenant'}.`, before: before.killSwitch, after: data.killSwitch }
    },
  },
  {
    name: 'relancer_le_site',
    title: 'Lever l’arrêt général',
    description: 'Lève l’arrêt général (retour à « Désactivé — tout fonctionne »). Un arrêt déclenché par le patron ne peut être levé que par un compte patron. Réservé patron et admin ; à distance, confirmation par bouton signé.',
    module: 'platform',
    access: 'admin',
    readOnly: false,
    input: { type: 'object', properties: {} },
    run: async (_input: unknown, ctx) => {
      const p = await payload()
      const before = (await getControls(p)) as Awaited<ReturnType<typeof getControls>> & { killSwitchBy?: string | null }
      if (before.killSwitch === 'off') return { summary: 'Aucun arrêt général en cours.', before: 'off', after: 'off' }
      if (ctx.principal.kind === 'staff' && ctx.principal.role !== 'patron' && (await stoppedByPatron(p, before.killSwitchBy)))
        throw new ActionError('forbidden', 'Arrêt déclenché par le patron : lui seul peut le lever.')
      await p.updateGlobal({ slug: 'controls', data: { killSwitch: 'off', killSwitchReason: '' } as never, req: await staffReq(p, ctx), overrideAccess: false, depth: 0 })
      return { summary: 'Arrêt général levé : tout fonctionne.', before: before.killSwitch, after: 'off' }
    },
  },
]
