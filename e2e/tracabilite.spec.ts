import { expect, test } from '@playwright/test'

/**
 * Lot 2 : chaque changement d’une tâche d’agent produit une notification (avant / après / ordre)
 * et une ligne d’audit qui portent le même action_id (act_<UUIDv7>). Écrit en base → @ecriture.
 */
const ADMIN = { email: process.env.DALIL_ADMIN_EMAIL || 'salam@mydalil.com', password: 'Cockpit-test-2026!', name: 'Saïd Test' }
const ACT = /^act_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

test.describe('Traçabilité des agents @ecriture', () => {
  test('avant, après et ordre : notifiés avec un action_id partagé avec l’audit', async ({ request }) => {
    test.skip(test.info().project.name !== 'ordinateur', 'une seule passe suffit')
    await request.post('/api/users/first-register', { data: ADMIN })
    expect((await request.post('/api/users/login', { data: { email: ADMIN.email, password: ADMIN.password } })).ok()).toBe(true)

    const slug = `trace-${Date.now()}`
    const agent = await request.post('/api/agents', { data: { name: 'Editorial (test)', slug, status: 'active', mission: 'Test de traçabilité.', provider: 'openai', model: 'gpt-test' } })
    expect(agent.ok(), await agent.text()).toBe(true)
    const agentId = (await agent.json()).doc.id

    const created = await request.post('/api/agent-tasks', { data: { title: `Horaires des musées (${slug})`, instructions: 'Vérifier les horaires.', agent: agentId } })
    expect(created.ok(), await created.text()).toBe(true)
    const taskId = (await created.json()).doc.id
    for (const status of ['running', 'review'] as const) {
      const r = await request.patch(`/api/agent-tasks/${taskId}`, { data: { status } })
      expect(r.ok(), await r.text()).toBe(true)
    }

    const notes = (await (await request.get(`/api/agent-notifications?where[task][equals]=${taskId}&sort=createdAt&limit=10`)).json()).docs as Array<{ phase: string; actionId: string; agentLabel: string; delivery: Record<string, string>; attachments: Array<{ href: string }> }>
    expect(notes.map((n) => n.phase)).toEqual(['order', 'before', 'after'])
    for (const n of notes) {
      expect(n.actionId).toMatch(ACT)
      expect(n.agentLabel).toBe('Editorial (test)')
      expect(n.delivery.admin).toBe('enregistré')
      expect(n.attachments[0].href).toBe(`/admin/collections/agent-tasks/${taskId}`)
    }
    // Sans jeton Telegram configuré, l’envoi est déclaré « non configuré », jamais « envoyé ».
    if (!process.env.TELEGRAM_BOT_TOKEN)
      await expect
        .poll(async () => ((await (await request.get(`/api/agent-notifications?where[task][equals]=${taskId}&where[phase][equals]=before&limit=1`)).json()).docs[0]?.delivery?.telegram_said), { timeout: 10_000 })
        .toBe('non configuré')
    if (!process.env.RESEND_API_KEY)
      await expect
        .poll(async () => ((await (await request.get(`/api/agent-notifications?where[task][equals]=${taskId}&where[phase][equals]=after&limit=1`)).json()).docs[0]?.delivery?.email), { timeout: 10_000 })
        .toBe('non configuré')

    const audit = (await (await request.get(`/api/audit-log?where[target][equals]=agent-tasks&where[targetId][equals]=${taskId}&sort=createdAt&limit=10`)).json()).docs as Array<{ actionId: string; action: string }>
    expect(audit.length).toBe(3)
    expect(audit.map((a) => a.actionId)).toEqual(notes.map((n) => n.actionId))
  })
})
