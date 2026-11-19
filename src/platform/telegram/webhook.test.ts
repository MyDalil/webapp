import { vi } from 'vitest'
vi.mock('server-only', () => ({}))
import { describe, expect, it } from 'vitest'
import { webhookUrl } from './send'

describe('adresse du webhook Telegram', () => {
  it('production : site public', () => {
    expect(webhookUrl('https://preview.mydalil.com', 'https://www.mydalil.com', { VERCEL_ENV: 'production' } as never)).toBe('https://www.mydalil.com/api/telegram')
  })
  it('preview : sa propre adresse, avec le contournement Vercel si exposé', () => {
    expect(webhookUrl('https://preview.mydalil.com', 'https://www.mydalil.com', { VERCEL_ENV: 'preview', VERCEL_AUTOMATION_BYPASS_SECRET: 'abc' } as never)).toBe('https://preview.mydalil.com/api/telegram?x-vercel-protection-bypass=abc')
    expect(webhookUrl('https://preview.mydalil.com', 'https://www.mydalil.com', { VERCEL_ENV: 'preview' } as never)).toBe('https://preview.mydalil.com/api/telegram')
  })
})

describe('variables signalées par le contrôle', () => {
  it('preview : pas de fausse alerte (production seulement, secret Telegram dérivé)', async () => {
    const { missingEnv } = await import('@/platform/ops/security')
    const base = { VERCEL_ENV: 'preview', REMOTE_SIGNING_SECRET: 'x'.repeat(40) }
    const m = missingEnv(base)
    expect(m).not.toContain('CRON_SECRET')
    expect(m).not.toContain('BACKUP_SECRET')
    expect(m).not.toContain('TELEGRAM_WEBHOOK_SECRET')
    expect(m).toContain('TELEGRAM_BOT_TOKEN')
    expect(missingEnv({ VERCEL_ENV: 'production' })).toContain('CRON_SECRET')
  })
})
