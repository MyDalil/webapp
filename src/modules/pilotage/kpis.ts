import type { Where } from 'payload'
import type { BadgeKey, IconName } from './admin/nav'

/** Accès aux données injecté : la logique reste testable sans base. */
export type Deps = {
  count: (collection: string, where?: Where) => Promise<number>
  sum: (collection: string, field: string, where?: Where) => Promise<number>
}

export type KpiKey = 'visiteurs' | 'contributions' | 'validation' | 'annonces' | 'fiches' | 'aVerifier' | 'coutIa' | 'erreurs'
export type Kpi = { key: KpiKey; value: number | null; label: string; href: string; icon: IconName; tone: 'ok' | 'wa' | 'da' | 'in'; unit?: string }

const iso = (d: Date) => d.toISOString()
const monthStart = (now: Date) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

export async function getPilotageKpis(deps: Deps, now: Date): Promise<Kpi[]> {
  const since24h = new Date(now.getTime() - 24 * 3600 * 1000)
  const defs: Array<Omit<Kpi, 'value'> & { get: () => Promise<number> }> = [
    { key: 'visiteurs', label: 'Visiteurs sur 24 h', icon: 'users', tone: 'ok', href: '/admin/collections/visitor-sessions', get: () => deps.count('visitor-sessions', { createdAt: { greater_than: iso(since24h) } }) },
    { key: 'contributions', label: 'Contributions à traiter', icon: 'inbox', tone: 'in', href: '/admin/collections/submissions?where%5Bstatus%5D%5Bequals%5D=new', get: () => deps.count('submissions', { status: { equals: 'new' } }) },
    { key: 'validation', label: 'Travaux d’agents à valider', icon: 'check', tone: 'wa', href: '/admin/collections/agent-tasks?where%5Bstatus%5D%5Bequals%5D=review', get: () => deps.count('agent-tasks', { status: { equals: 'review' } }) },
    { key: 'annonces', label: 'Annonces à contrôler', icon: 'tag', tone: 'da', href: '/admin/collections/classifieds?where%5Bstatus%5D%5Bequals%5D=pending', get: () => deps.count('classifieds', { status: { equals: 'pending' } }) },
    { key: 'fiches', label: 'Fiches publiées', icon: 'file', tone: 'ok', href: '/admin/collections/places', get: () => deps.count('places', { _status: { equals: 'published' } }) },
    { key: 'aVerifier', label: 'Fiches à vérifier (équipe)', icon: 'shield', tone: 'wa', href: '/admin/collections/places?where%5Bverification%5D%5Bin%5D=spotted,checking', get: () => deps.count('places', { verification: { in: ['spotted', 'checking'] } }) },
    { key: 'coutIa', label: 'Coût IA du mois', icon: 'cpu', tone: 'ok', unit: '$', href: '/admin/collections/ai-usage', get: async () => Math.round((await deps.sum('ai-usage', 'costMicros', { createdAt: { greater_than_equal: iso(monthStart(now)) } })) / 10_000) / 100 },
    { key: 'erreurs', label: 'Erreurs non résolues', icon: 'pulse', tone: 'da', href: '/admin/collections/error-logs?where%5Bresolved%5D%5Bequals%5D=false', get: () => deps.count('error-logs', { resolved: { equals: false } }) },
  ]
  const results = await Promise.allSettled(defs.map((d) => d.get()))
  return defs.map(({ get: _get, ...d }, i) => {
    const r = results[i]
    return { ...d, value: r.status === 'fulfilled' ? r.value : null }
  })
}

export async function getBadges(deps: Deps): Promise<Partial<Record<BadgeKey, number>>> {
  const entries: Array<[BadgeKey, Promise<number>]> = [
    ['validation', deps.count('agent-tasks', { status: { equals: 'review' } })],
    ['taches', deps.count('agent-tasks', { status: { in: ['new', 'running', 'paused'] } })],
    ['contributions', deps.count('submissions', { status: { equals: 'new' } })],
    ['annonces', deps.count('classifieds', { status: { equals: 'pending' } })],
  ]
  const values = await Promise.allSettled(entries.map(([, p]) => p))
  return Object.fromEntries(entries.flatMap(([k], i) => (values[i].status === 'fulfilled' ? [[k, (values[i] as PromiseFulfilledResult<number>).value]] : [])))
}
