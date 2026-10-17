// @ts-nocheck — script de test local : les objets utilisateur sont simplifiés.
/**
 * Test du socle du dashboard (base locale uniquement) : rôles, verrous, audit.
 * Lancer : DALIL_DATABASE_URL=… pnpm tsx scripts/test-socle-dashboard.ts
 */
import { getPayload } from 'payload'
import config from '../src/payload.config'

const ok: string[] = []
const ko: string[] = []
const expect = (name: string, cond: boolean) => (cond ? ok : ko).push(name)
const refused = async (name: string, fn: () => Promise<unknown>) => {
  try {
    await fn()
    ko.push(`${name} (accepté à tort)`)
  } catch {
    ok.push(name)
  }
}

const run = async () => {
  const p = await getPayload({ config })
  if (!/localhost|127\.0\.0\.1|host=\/tmp/.test(process.env.DALIL_DATABASE_URL ?? '')) throw new Error('Base locale uniquement.')
  const mk = async (email: string, name: string, role: string) => {
    const u = await p.create({ collection: 'users', overrideAccess: true, data: { email, name, role: role as 'admin', password: 'Test-12345678' } })
    return { ...u, collection: 'users' as const }
  }
  const rad = await mk('rad@test.local', 'Rad', 'admin')
  const said = await mk('said@test.local', 'Saïd', 'admin')
  // Aucun patron encore : un admin peut désigner le premier.
  await p.update({ collection: 'users', id: said.id, data: { role: 'patron' }, user: rad, overrideAccess: false })
  const saidP = { ...said, role: 'patron' as const }
  await refused('un admin ne retire pas le rôle patron', () => p.update({ collection: 'users', id: said.id, data: { role: 'admin' }, user: rad, overrideAccess: false }))
  await refused('un admin ne se donne pas le rôle patron', () => p.update({ collection: 'users', id: rad.id, data: { role: 'patron' }, user: rad, overrideAccess: false }))

  const agentDoc = await p.create({ collection: 'agents', data: { name: 'Editorial', slug: 'editorial', mission: 'Rédiger', provider: 'anthropic', model: 'modele-leger', scopes: ['annuaire'] }, user: rad, overrideAccess: false })
  const agent = { ...agentDoc, collection: 'agents' as const }

  await refused('un agent ne crée pas de tâche Vie musulmane', () => p.create({ collection: 'agent-tasks', data: { title: 'Guide Omra 2027', instructions: 'Rédiger', agent: agent.id }, user: agent, overrideAccess: false }))
  await refused('un humain n’assigne pas Vie musulmane à un agent', () => p.create({ collection: 'agent-tasks', data: { title: 'Horaires', instructions: 'Rubrique Vie musulmane', agent: agent.id }, user: rad, overrideAccess: false }))

  const t = await p.create({ collection: 'agent-tasks', data: { title: 'Fiche Jardin d’Essai', instructions: 'Rédiger la fiche', agent: agent.id }, user: saidP, overrideAccess: false })
  expect('origine patron enregistrée', t.origin === 'patron')
  await p.update({ collection: 'agent-tasks', id: t.id, data: { status: 'running', result: 'brouillon' }, user: agent, overrideAccess: false })
  await refused('un agent ne valide pas sa tâche', () => p.update({ collection: 'agent-tasks', id: t.id, data: { status: 'done' }, user: agent, overrideAccess: false }))
  await refused('un agent ne change pas sa priorité', () => p.update({ collection: 'agent-tasks', id: t.id, data: { priority: 'urgent' }, user: agent, overrideAccess: false }))
  await refused('Rad n’annule pas un ordre de Saïd', () => p.update({ collection: 'agent-tasks', id: t.id, data: { status: 'cancelled' }, user: rad, overrideAccess: false }))
  await p.update({ collection: 'agent-tasks', id: t.id, data: { status: 'paused' }, user: saidP, overrideAccess: false })
  await refused('un agent ne reprend pas une tâche en pause', () => p.update({ collection: 'agent-tasks', id: t.id, data: { status: 'running' }, user: agent, overrideAccess: false }))

  const m = await p.create({ collection: 'agent-messages', data: { body: 'Je suis Saïd', fromLabel: 'Saïd', fromKind: 'humain', kind: 'note' }, user: agent, overrideAccess: false })
  expect('message signé par la session, pas par le texte', m.fromLabel === 'Editorial' && m.fromKind === 'agent')
  await refused('un message ne se modifie pas', () => p.update({ collection: 'agent-messages', id: m.id, data: { body: 'x' }, user: rad, overrideAccess: false }))

  const post = await p.create({ collection: 'telegram-posts', data: { title: 'Nouveautés', text: 'Salam' }, user: agent, overrideAccess: false })
  await refused('Rad ne programme pas sur le canal', () => p.update({ collection: 'telegram-posts', id: post.id, data: { status: 'scheduled' }, user: rad, overrideAccess: false }))
  await refused('un agent ne programme pas sur le canal', () => p.update({ collection: 'telegram-posts', id: post.id, data: { status: 'scheduled' }, user: agent, overrideAccess: false }))
  const sched = await p.update({ collection: 'telegram-posts', id: post.id, data: { status: 'scheduled' }, user: saidP, overrideAccess: false })
  expect('Saïd programme sur le canal', sched.status === 'scheduled' && Number((sched.decidedBy as { id?: number })?.id ?? sched.decidedBy) === said.id)

  await refused('Rad ne change pas le canal Telegram', async () => {
    const g = await p.updateGlobal({ slug: 'controls', data: { telegramChannelId: '@x' }, user: rad, overrideAccess: false })
    if (g.telegramChannelId !== '@x') throw new Error('ignoré')
  })
  const g = await p.updateGlobal({ slug: 'controls', data: { killSwitch: 'stop', killSwitchReason: 'test' }, user: rad, overrideAccess: false })
  expect('arrêt général horodaté et signé', g.killSwitchBy === 'Rad' && !!g.killSwitchAt)

  const { totalDocs } = await p.count({ collection: 'audit-log', overrideAccess: true })
  expect(`journal d’audit alimenté (${totalDocs} lignes)`, totalDocs >= 8)
  await refused('le journal refuse UPDATE en base', () => (p.db as unknown as { pool: { query: (q: string) => Promise<unknown> } }).pool.query('update audit_log set summary = $$x$$'))
  await refused('le journal refuse DELETE en base', () => (p.db as unknown as { pool: { query: (q: string) => Promise<unknown> } }).pool.query('delete from audit_log'))

  console.log(`\nOK (${ok.length})\n- ${ok.join('\n- ')}`)
  if (ko.length) console.log(`\nÉCHEC (${ko.length})\n- ${ko.join('\n- ')}`)
  process.exit(ko.length ? 1 : 0)
}
run().catch((e) => {
  console.error(e)
  process.exit(1)
})
