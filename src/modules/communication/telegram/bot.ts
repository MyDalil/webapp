import { createLocalReq, type Payload } from 'payload'
import { activateRole, reserveRole } from '@/modules/agents'
import { sendText } from '@/platform/telegram/send'
import { AIDE, parseCommand } from './commands'

type Update = { update_id?: number; message?: { chat?: { id?: number | string; type?: string }; from?: { id?: number }; text?: string } }
type UserRow = { id: number; name?: string; role?: string; telegramId?: string }

const STATUS_FR: Record<string, string> = { new: 'nouvelle', running: 'en cours', paused: 'en pause', review: 'à valider', done: 'terminée', cancelled: 'annulée', failed: 'échec' }
const TARGET: Record<string, string> = { valider: 'done', rejeter: 'cancelled', pause: 'paused', reprendre: 'running', annuler: 'cancelled' }
const monthStart = () => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString() }
const errText = (e: unknown) => (e as { message?: string })?.message?.slice(0, 300) || 'Action refusée.'

/**
 * Traite un message reçu par le webhook. Seuls les comptes de l’équipe dont l’« Identifiant Telegram » correspond
 * sont servis ; chaque action passe par leurs droits réels (le patron l’emporte, Vie musulmane refusée aux agents…).
 * Retourne la réponse envoyée (null si le message est ignoré).
 */
export async function handleUpdate(payload: Payload, update: Update): Promise<string | null> {
  const msg = update.message
  const chatId = msg?.chat?.id != null ? String(msg.chat.id) : null
  if (!chatId || msg?.chat?.type !== 'private' || typeof msg.text !== 'string') return null
  const cmd = parseCommand(msg.text)
  const found = await payload.find({ collection: 'users', where: { telegramId: { equals: chatId } }, limit: 1, depth: 0, overrideAccess: true })
  const user = found.docs[0] as unknown as UserRow | undefined
  const reply = async (text: string) => { await sendText(chatId, text); return text }

  if (!user || !['patron', 'admin'].includes(String(user.role))) {
    // Inconnu : seulement son identifiant, pour que l’équipe l’ajoute à son compte. Rien d’autre.
    return cmd.kind === 'start' ? reply(`Votre identifiant Telegram : ${chatId}\nDonnez-le à l’administrateur de DALIL pour l’ajouter à votre compte.`) : null
  }

  const req = await createLocalReq({ user: { ...user, collection: 'users' } as never, context: { channel: 'telegram' } }, payload)
  const ask = { req, overrideAccess: false as const, depth: 0 }
  try {
    switch (cmd.kind) {
      case 'start':
      case 'aide':
        return reply(`Salam ${user.name ?? ''}.\n${AIDE}`)
      case 'erreur':
        return reply(cmd.message)
      case 'etat': {
        const c = (await payload.findGlobal({ slug: 'controls', ...ask })) as { killSwitch?: string; agentsMonthlyBudgetUsd?: number | null }
        const [active, running, review, usage] = await Promise.all([
          payload.count({ collection: 'agents', where: { status: { equals: 'active' } }, ...ask }),
          payload.count({ collection: 'agent-tasks', where: { status: { equals: 'running' } }, ...ask }),
          payload.count({ collection: 'agent-tasks', where: { status: { equals: 'review' } }, ...ask }),
          payload.find({ collection: 'ai-usage', where: { createdAt: { greater_than_equal: monthStart() } }, pagination: false, select: { costMicros: true } as never, ...ask }),
        ])
        const cost = usage.docs.reduce((n, d) => n + (Number((d as { costMicros?: number }).costMicros) || 0), 0) / 1_000_000
        return reply([
          `Arrêt général : ${c.killSwitch === 'off' || !c.killSwitch ? 'désactivé' : c.killSwitch}`,
          `Agents actifs : ${active.totalDocs}`,
          `Tâches en cours : ${running.totalDocs} · à valider : ${review.totalDocs}`,
          `Coût IA du mois : ${cost.toFixed(2)} $${c.agentsMonthlyBudgetUsd != null ? ` / ${c.agentsMonthlyBudgetUsd} $` : ' (budget agents non défini : aucun agent ne travaille)'}`,
        ].join('\n'))
      }
      case 'taches': {
        const r = await payload.find({ collection: 'agent-tasks', where: { status: { in: ['new', 'running', 'paused', 'review'] } }, sort: '-updatedAt', limit: 8, ...ask, depth: 1 })
        if (!r.docs.length) return reply('Aucune tâche en cours.')
        return reply(r.docs.map((t) => `#${t.id} [${STATUS_FR[String(t.status)] ?? t.status}] ${t.title}${(t.agent as { name?: string } | null)?.name ? ` — ${(t.agent as { name: string }).name}` : ''}`).join('\n'))
      }
      case 'task': {
        const data: Record<string, unknown> = { status: TARGET[cmd.action] }
        if (cmd.action === 'rejeter' && cmd.note) data.directive = `Rejeté : ${cmd.note}`
        await payload.update({ collection: 'agent-tasks', id: cmd.id, data: data as never, ...ask })
        return reply(`Tâche #${cmd.id} : ${STATUS_FR[TARGET[cmd.action]]}.`)
      }
      case 'directive':
        await payload.update({ collection: 'agent-tasks', id: cmd.id, data: { directive: cmd.text }, ...ask })
        return reply(`Directive enregistrée sur #${cmd.id}. L’agent la lit avant sa prochaine étape.`)
      case 'role': {
        const r = cmd.action === 'activer' ? await activateRole(payload, cmd.slug, { ...user, collection: 'users' }) : await reserveRole(payload, cmd.slug, { ...user, collection: 'users' })
        return reply(`${cmd.slug} : ${r.ok ? (cmd.action === 'activer' ? 'activé' : 'en réserve') : 'non activé'} — ${r.detail}`)
      }
      case 'arret':
        await payload.updateGlobal({ slug: 'controls', data: { killSwitch: cmd.mode } as never, ...ask })
        return reply(cmd.mode === 'off' ? 'Arrêt général désactivé. Les agents peuvent reprendre.' : `Arrêt général : ${cmd.mode}.`)
      case 'publier':
        await payload.update({ collection: 'telegram-posts', id: cmd.id, data: { status: 'scheduled' } as never, ...ask })
        return reply(`Publication #${cmd.id} programmée. Envoi sur le canal en cours.`)
      case 'ordre': {
        const title = cmd.text.split('\n')[0].slice(0, 80)
        const t = await payload.create({ collection: 'agent-tasks', data: { title, instructions: cmd.text, status: 'new' } as never, ...ask })
        return reply(`Tâche #${t.id} créée. Le CEO s’en occupe. Suivi : /taches`)
      }
    }
  } catch (e) {
    return reply(`Refusé : ${errText(e)}`)
  }
  return null
}
