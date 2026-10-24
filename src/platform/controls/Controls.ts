import type { GlobalBeforeChangeHook, GlobalConfig, Payload } from 'payload'
import { isAdmin, isPatronField, isStaff } from '@/platform/access'

export type KillSwitch = 'off' | 'drain' | 'stop' | 'cut'

/** Horodate l’arrêt général et note qui l’a déclenché. */
const stamp: GlobalBeforeChangeHook = ({ data, originalDoc, req }) => {
  if (data.killSwitch && data.killSwitch !== originalDoc?.killSwitch) {
    data.killSwitchAt = new Date().toISOString()
    data.killSwitchBy = (req.user as { name?: string } | null)?.name ?? 'Système'
  }
  return data
}

/** Commandes de sécurité de DALIL : arrêt général, IA des agents, Telegram, maintenance, budgets. */
export const Controls: GlobalConfig = {
  slug: 'controls',
  label: 'Commandes et sécurité',
  admin: { group: 'Système' },
  access: { read: isStaff, update: isAdmin },
  hooks: { beforeChange: [stamp] },
  fields: [
    {
      name: 'killSwitch',
      type: 'select',
      label: 'Arrêt général',
      required: true,
      defaultValue: 'off',
      options: [
        { label: 'Désactivé — tout fonctionne', value: 'off' },
        { label: 'Finir puis arrêter — les agents finissent l’étape en cours, puis s’arrêtent', value: 'drain' },
        { label: 'Arrêter maintenant — les agents s’arrêtent à l’étape suivante', value: 'stop' },
        { label: 'Tout couper — agents, IA et Telegram coupés', value: 'cut' },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'killSwitchAt', type: 'date', label: 'Déclenché le', admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
        { name: 'killSwitchBy', type: 'text', label: 'Par', admin: { readOnly: true } },
      ],
    },
    { name: 'killSwitchReason', type: 'text', label: 'Raison de l’arrêt' },
    {
      type: 'row',
      fields: [
        { name: 'agentsEnabled', type: 'checkbox', label: 'Agents IA actifs', defaultValue: true },
        { name: 'telegramEnabled', type: 'checkbox', label: 'Bot Telegram actif', defaultValue: true },
        { name: 'maintenance', type: 'checkbox', label: 'Site en maintenance', defaultValue: false },
      ],
    },
    {
      name: 'agentsMonthlyBudgetUsd',
      type: 'number',
      label: 'Budget mensuel total des agents (USD)',
      min: 0,
      admin: { description: 'Vide = aucun agent ne travaille. Chaque agent a aussi son propre plafond.' },
    },
    {
      name: 'telegramChannelId',
      type: 'text',
      label: 'Canal Telegram (identifiant ou @nom)',
      access: { update: isPatronField },
      admin: { description: 'Modifiable par le patron seulement. Le bot doit être administrateur du canal.' },
    },
  ],
}

export type ControlsDoc = { killSwitch: KillSwitch; agentsEnabled?: boolean | null; telegramEnabled?: boolean | null; maintenance?: boolean | null; agentsMonthlyBudgetUsd?: number | null; telegramChannelId?: string | null }

/** Lecture serveur des commandes (sans contrôle d’accès). */
export async function getControls(payload: Payload): Promise<ControlsDoc> {
  return (await payload.findGlobal({ slug: 'controls', overrideAccess: true, depth: 0 })) as unknown as ControlsDoc
}

/** Un agent peut-il faire une étape de plus maintenant ? */
export async function agentsMayRun(payload: Payload): Promise<{ ok: true } | { ok: false; reason: string }> {
  const c = await getControls(payload)
  if (c.killSwitch === 'stop' || c.killSwitch === 'cut') return { ok: false, reason: 'Arrêt général actif.' }
  if (c.killSwitch === 'drain') return { ok: false, reason: 'Arrêt général : finir puis arrêter.' }
  if (!c.agentsEnabled) return { ok: false, reason: 'Agents désactivés.' }
  if (!c.agentsMonthlyBudgetUsd) return { ok: false, reason: 'Budget des agents non défini.' }
  return { ok: true }
}
