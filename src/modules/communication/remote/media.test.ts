import { describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
import { transcribeProvider } from './media'

describe('fournisseur de transcription', () => {
  it('OpenAI par défaut, Groq sur demande', () => {
    expect(transcribeProvider({ OPENAI_API_KEY: 'k' })).toMatchObject({ model: 'gpt-4o-mini-transcribe', key: 'k' })
    expect(transcribeProvider({ TRANSCRIBE_PROVIDER: 'groq', GROQ_API_KEY: 'g', OPENAI_API_KEY: 'k' })).toMatchObject({ model: 'whisper-large-v3-turbo', key: 'g', url: expect.stringContaining('api.groq.com') })
    expect(transcribeProvider({ TRANSCRIBE_PROVIDER: 'groq' }).key).toBeUndefined()
  })
})
