import 'server-only'
import type { PayloadRequest } from 'payload'
import type { ActionContext, ActionDef, Lang, Principal } from '@/platform/actions/types'
import { allowed, createRunner, siteContext } from '@/platform/actions'
import { audit } from '@/platform/audit/audit'
import { actionId } from '@/platform/audit/uuidv7'
import { payload } from '@/platform/http'
import { notifyStaff } from '@/platform/telegram/notify'
import { opsActions } from '@/platform/ops/actions'
import { controlActions } from '@/platform/controls/actions'
import { metricsActions } from '@/platform/metrics/actions'
import { annoncesActions } from '@/modules/annonces'
import { annuaireActions } from '@/modules/annuaire'
import { communicationActions } from '@/modules/communication'
import { contenusActions } from '@/modules/contenus'
import { paymentActions, prosActions } from '@/modules/pros'
import { rechercheActions } from '@/modules/recherche'
import { santeActions } from '@/modules/sante'
import { servicesActions } from '@/modules/services'

/** CONTRAT : registre de toutes les actions DALIL (site, MCP, Telegram, WhatsApp, admin, tâches). */
export function allActions(): ActionDef[] {
  const seen = new Set<string>()
  return [
    ...rechercheActions,
    ...annuaireActions,
    ...santeActions,
    ...servicesActions,
    ...annoncesActions,
    ...contenusActions,
    ...communicationActions,
    ...prosActions,
    ...paymentActions,
    ...metricsActions,
    ...opsActions,
    ...controlActions,
  ].filter((a) => {
    if (seen.has(a.name)) {
      console.error(`[registre] action en double ignorée : ${a.name} (${a.module})`)
      return false
    }
    seen.add(a.name)
    return true
  })
}

/** Actions autorisées pour ce compte. */
export function actionsFor(principal: Principal): ActionDef[] {
  return allActions().filter((a) => allowed(a.access, principal))
}

const run = createRunner({
  actions: allActions,
  notify: (text, opts) => notifyStaff(text, opts),
  async audit({ def, ctx, ok, summary, consumed }) {
    // Écriture réussie déjà tracée par Payload (la ligne de la fiche porte l’identifiant de l’action) : rien à ajouter.
    if (ok && consumed) return
    const user = ctx.principal.kind === 'staff' ? { collection: 'users', id: ctx.principal.userId, name: ctx.principal.name } : null
    const req = { user, context: { channel: ctx.channel, actionName: def.name } } as unknown as PayloadRequest
    await audit(await payload(), req, { action: def.name, summary: `${ok ? '' : 'échec : '}${def.title} — ${summary}`, actionId: consumed ? undefined : ctx.actionId })
  },
})

/** Exécute une action : contrôle d’accès, brouillon forcé selon le canal, journal d’audit, notification équipe. */
export async function runAction(name: string, input: unknown, ctx: ActionContext): Promise<unknown> {
  return run(name, input, ctx)
}

export function newActionId(): string {
  return actionId()
}

/** Appel direct depuis une page du site (sans HTTP) : visiteur public, canal « site ». */
export async function callAsSite<O = unknown>(name: string, input: unknown, lang: Lang = 'fr'): Promise<O> {
  return (await runAction(name, input, siteContext(lang, newActionId()))) as O
}
