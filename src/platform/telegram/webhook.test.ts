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
