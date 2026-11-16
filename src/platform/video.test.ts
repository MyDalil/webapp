import { afterEach, describe, expect, it, vi } from 'vitest'
import { createVideoRoom, videoEnabled } from './video'

describe('A12 — visio seulement avec un fournisseur implémenté', () => {
  afterEach(() => {
    delete process.env.VIDEO_PROVIDER
    delete process.env.DAILY_API_KEY
    vi.unstubAllGlobals()
  })
  it('une variable non vide ne suffit pas', async () => {
    process.env.VIDEO_PROVIDER = 'livekit'
    expect(videoEnabled()).toBe(false)
    expect(await createVideoRoom({ appointmentId: 1, start: '', end: '' })).toBeNull()
  })
  it('Daily sans clé : visio fermée', () => {
    process.env.VIDEO_PROVIDER = 'daily'
    expect(videoEnabled()).toBe(false)
  })
  it('Daily avec clé : salle privée, 2 participants, ouverte autour du créneau', async () => {
    process.env.VIDEO_PROVIDER = 'daily'
    process.env.DAILY_API_KEY = 'test'
    const fetch = vi.fn(async () => new Response(JSON.stringify({ url: 'https://dalil.daily.co/dalil-abc' }), { status: 200 }))
    vi.stubGlobal('fetch', fetch)
    const url = await createVideoRoom({ appointmentId: 1, start: '2026-12-01T09:00:00Z', end: '2026-12-01T09:30:00Z' })
    expect(url).toBe('https://dalil.daily.co/dalil-abc')
    const body = JSON.parse((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
    expect(body.properties.max_participants).toBe(2)
    expect(body.properties.enable_recording).toBe(false)
    expect(body.properties.nbf).toBe(Date.parse('2026-12-01T08:45:00Z') / 1000)
    expect(body.properties.exp).toBe(Date.parse('2026-12-01T10:00:00Z') / 1000)
  })
  it('échec du fournisseur : aucun lien', async () => {
    process.env.VIDEO_PROVIDER = 'daily'
    process.env.DAILY_API_KEY = 'test'
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })))
    expect(await createVideoRoom({ appointmentId: 1, start: '2026-12-01T09:00:00Z', end: '2026-12-01T09:30:00Z' })).toBeNull()
  })
})
