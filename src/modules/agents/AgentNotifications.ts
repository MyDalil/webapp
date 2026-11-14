import { after } from 'next/server'
import type { CollectionAfterChangeHook, CollectionConfig, Payload, PayloadRequest } from 'payload'
import { isStaff, isStaffUser } from '@/platform/access'
import { reserveActionId } from '@/platform/audit/audit'
import { getControls } from '@/platform/controls/Controls'
import { layout, paragraphs, send, SITE, TEAM } from '@/platform/mail'
import { sendTelegram } from '@/platform/telegram/send'
import { CHANNELS, channelsFor, type ChannelKey, formatNotification, type NotifySettings, type Phase, PHASE_LABEL, phaseOf } from './notify'

/**
 * Fil d’activité des agents : une ligne par notification (avant, pendant, après, ordre),
 * avec l’`action_id`, le travail joint et l’état d’envoi de chaque canal. Ajout seul.
 */
export const AgentNotifications: CollectionConfig = {
  slug: 'agent-notifications',
  labels: { singular: 'Notification', plural: 'Fil d’activité' },
  admin: { group: 'Équipe IA', useAsTitle: 'title', defaultColumns: ['createdAt', 'phase', 'agentLabel', 'title', 'actionId'] },
  defaultSort: '-createdAt',
  access: { read: isStaff, create: () => false, update: ({ req: { user } }) => isStaffUser(user), delete: () => false },
  timestamps: true,
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'phase', type: 'select', label: 'Moment', required: true, index: true, options: (Object.keys(PHASE_LABEL) as Phase[]).map((v) => ({ value: v, label: PHASE_LABEL[v] })), admin: { readOnly: true } },
        { name: 'agentLabel', type: 'text', label: 'Agent', admin: { readOnly: true } },
        { name: 'actionId', type: 'text', label: 'Identifiant d’action', index: true, admin: { readOnly: true } },
      ],
    },
    { name: 'title', type: 'text', label: 'Titre', required: true, admin: { readOnly: true } },
    { name: 'body', type: 'textarea', label: 'Détail', admin: { readOnly: true } },
    {
      type: 'row',
      fields: [
        { name: 'agent', type: 'relationship', relationTo: 'agents', label: 'Fiche agent', admin: { readOnly: true } },
        { name: 'task', type: 'relationship', relationTo: 'agent-tasks', label: 'Tâche', index: true, admin: { readOnly: true } },
      ],
    },
    { name: 'attachments', type: 'json', label: 'Travail joint', admin: { readOnly: true, description: 'Liens vers le travail : tâche, différences, sources.' } },
    { name: 'delivery', type: 'json', label: 'Envoi par canal', admin: { readOnly: true } },
    { name: 'readBy', type: 'relationship', relationTo: 'users', hasMany: true, label: 'Lu par' },
  ],
}

type Attachment = { label: string; href: string }
export type Notice = { phase: Phase; title: string; body?: string; agentId?: number | string | null; agentLabel: string; taskId?: number | string | null; attachments?: Attachment[]; actionId?: string }

/** Enregistre la notification et l’envoie sur les canaux choisis dans « Commandes ». Ne fait jamais échouer l’action d’origine. */
export async function notify(payload: Payload, req: PayloadRequest | undefined, n: Notice) {
  try {
    const controls = (await getControls(payload)) as unknown as { notifications?: NotifySettings }
    const channels = channelsFor(n.phase, controls.notifications)
    const actionId = n.actionId ?? (req ? reserveActionId(req) : `act_${crypto.randomUUID()}`)
    const link = n.taskId ? `${SITE}/admin/collections/agent-tasks/${n.taskId}` : `${SITE}/admin`
    const text = formatNotification({ phase: n.phase, agent: n.agentLabel, title: n.title, actionId, link })
    const pending: Partial<Record<ChannelKey, string>> = Object.fromEntries(channels.map((c) => [c, c === 'admin' ? 'enregistré' : 'en attente']))
    const row = await payload.create({
      collection: 'agent-notifications',
      overrideAccess: true,
      // Même transaction que l’action notifiée (la tâche n’est peut-être pas encore validée en base).
      req,
      data: {
        phase: n.phase,
        title: n.title.slice(0, 200),
        body: n.body,
        agentLabel: n.agentLabel,
        agent: (n.agentId as number) ?? undefined,
        task: (n.taskId as number) ?? undefined,
        actionId,
        attachments: [...(n.taskId ? [{ label: 'Tâche', href: `/admin/collections/agent-tasks/${n.taskId}` }] : []), ...(n.attachments ?? [])],
        delivery: pending,
      },
    })
    // Envois externes après la réponse : jamais pendant la transaction de la base.
    const dispatch = async () => {
      const delivery = { ...pending }
      await Promise.all(
        channels.map(async (c) => {
          if (c === 'telegram_said') delivery[c] = await sendTelegram('said', text, payload)
          else if (c === 'telegram_rad') delivery[c] = await sendTelegram('rad', text, payload)
          else if (c === 'email') {
            const html = layout(`${PHASE_LABEL[n.phase]} · ${n.agentLabel}`, paragraphs(`${n.title}\n${n.body ?? ''}\n${actionId}`), { label: 'Voir le travail', href: link })
            delivery[c] = await send(TEAM, `[DALIL] ${PHASE_LABEL[n.phase]} · ${n.agentLabel} — ${n.title}`.slice(0, 140), html).then((ok) => (ok ? 'accepté' : process.env.RESEND_API_KEY ? 'échec' : 'non configuré'), () => 'échec')
          }
        }),
      )
      await payload.update({ collection: 'agent-notifications', id: row.id, overrideAccess: true, data: { delivery } }).catch((e) => console.error('[notifications] état d’envoi', e))
    }
    try {
      after(dispatch)
    } catch {
      void dispatch() // hors requête (CLI, tâche planifiée)
    }
    return actionId
  } catch (e) {
    console.error('[notifications] envoi impossible', e)
    return null
  }
}

/** Chaque changement d’état d’une tâche produit sa notification (avant / pendant / après / ordre). */
export const notifyTaskChange: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  const phase = phaseOf(operation === 'create' ? undefined : previousDoc, doc)
  // Une tâche à faire (création, reprise, nouvelle directive) par un humain ou le système : la file avance après la réponse.
  const byAgent = (req.user as { collection?: string } | null)?.collection === 'agents'
  const directiveChanged = operation === 'update' && doc.directive !== previousDoc?.directive
  if (!byAgent && (doc.status === 'new' || (doc.status === 'running' && (previousDoc?.status !== 'running' || directiveChanged)))) {
    const run = async () => { const { runQueue } = await import('./runtime/queue'); await runQueue(req.payload).catch((e) => console.error('[agents] file', e)) }
    try { after(run) } catch { /* hors requête : la tâche planifiée prendra le relais */ }
  }
  if (!phase) return doc
  const agent = doc.agent && typeof doc.agent === 'object' ? doc.agent : null
  let agentLabel = (agent as { name?: string } | null)?.name ?? null
  if (!agentLabel && doc.agent) {
    const a = await req.payload.findByID({ collection: 'agents', id: doc.agent as number, depth: 0, overrideAccess: true, req }).catch(() => null)
    agentLabel = (a as { name?: string } | null)?.name ?? null
  }
  const body =
    phase === 'during' ? `Étape ${doc.steps ?? 0}${doc.maxSteps ? ` sur ${doc.maxSteps}` : ''}.`
    : phase === 'after' ? (doc.status === 'failed' ? `Échec : ${doc.error ?? 'cause non renseignée'}` : doc.status === 'review' ? 'Travail prêt à valider.' : 'Tâche terminée.')
    : phase === 'order' ? `État : ${doc.status}.${doc.directive ? ` Directive : ${doc.directive}` : ''}`
    : String(doc.instructions ?? '').slice(0, 300)
  await notify(req.payload, req, { phase, title: String(doc.title), body, agentId: (agent as { id?: number } | null)?.id ?? (doc.agent as number | null), agentLabel: agentLabel ?? 'CEO', taskId: doc.id })
  return doc
}

export { CHANNELS }
