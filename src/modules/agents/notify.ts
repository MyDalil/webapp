import type { TaskStatus } from './referentiel'

/**
 * Notifications des agents (décision de Rad, 14 nov. 2026) : avant, pendant et après chaque action,
 * avec le travail joint. Saïd et Rad suivent sans intervenir, ou interviennent.
 */
export type Phase = 'before' | 'during' | 'after' | 'order'
export type ChannelKey = 'admin' | 'telegram_said' | 'telegram_rad' | 'email'
export type NotifySettings = Partial<Record<Phase, ChannelKey[] | null>>

export const PHASE_LABEL: Record<Phase, string> = { before: 'Avant', during: 'Pendant', after: 'Après', order: 'Ordre' }
export const CHANNELS: Array<{ value: ChannelKey; label: string }> = [
  { value: 'admin', label: 'Fil de l’admin' },
  { value: 'telegram_said', label: 'Telegram de Saïd' },
  { value: 'telegram_rad', label: 'Telegram de Rad' },
  { value: 'email', label: 'Email' },
]

export const DEFAULT_NOTIFY: Record<Phase, ChannelKey[]> = {
  before: ['admin', 'telegram_said', 'telegram_rad'],
  during: ['admin'],
  after: ['admin', 'telegram_said', 'telegram_rad', 'email'],
  order: ['admin', 'telegram_said', 'telegram_rad'],
}

/** Canaux d’une phase ; le fil de l’admin est toujours servi (c’est le registre). */
export function channelsFor(phase: Phase, settings: NotifySettings | null | undefined): ChannelKey[] {
  const chosen = settings?.[phase] ?? DEFAULT_NOTIFY[phase]
  return ['admin', ...chosen.filter((c) => c !== 'admin')]
}

type TaskState = { status?: TaskStatus | string | null; steps?: number | null }

/** Phase à notifier pour un changement de tâche ; null = rien à signaler. */
export function phaseOf(prev: TaskState | undefined, next: TaskState): Phase | null {
  if (!prev) return 'order'
  const a = prev.status
  const b = next.status
  if (a !== 'running' && b === 'running') return 'before'
  if (a === 'running' && b === 'running') return (next.steps ?? 0) > (prev.steps ?? 0) ? 'during' : null
  if (b === 'review' || b === 'done' || b === 'failed') return a === b ? null : 'after'
  if (b === 'paused' || b === 'cancelled') return a === b ? null : 'order'
  return null
}

export function formatNotification(n: { phase: Phase; agent: string; title: string; actionId: string; link: string }) {
  return `${PHASE_LABEL[n.phase]} · ${n.agent}\n${n.title}\nTravail : ${n.link}\n${n.actionId}`
}
