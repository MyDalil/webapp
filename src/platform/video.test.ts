import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createVideoRoom, videoEnabled, videoRoomName, videoToken, videoWindow } from './video'

const KEYS = ['VIDEO_PROVIDER', 'LIVEKIT_URL', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET'] as const

describe('A12 — visio seulement avec un fournisseur implémenté et configuré', () => {
  afterEach(() => KEYS.forEach((k) => delete process.env[k]))
  it('une variable non vide ne suffit pas', async () => {
    process.env.VIDEO_PROVIDER = 'daily'
    expect(videoEnabled()).toBe(false)
    expect(await createVideoRoom({ appointmentId: 1, start: '', end: '' })).toBeNull()
  })
  it('LiveKit sans clés : visio fermée', () => {
    process.env.VIDEO_PROVIDER = 'livekit'
    expect(videoEnabled()).toBe(false)
  })
})

describe('LiveKit', () => {
  beforeEach(() => Object.assign(process.env, { VIDEO_PROVIDER: 'livekit', LIVEKIT_URL: 'wss://test.livekit.cloud', LIVEKIT_API_KEY: 'key', LIVEKIT_API_SECRET: 'secret-de-test-assez-long-pour-hs256' }))
  afterEach(() => KEYS.forEach((k) => delete process.env[k]))
  it('lien vers la page DALIL qui contrôle l’accès', async () => {
    expect(await createVideoRoom({ appointmentId: 7, start: '', end: '' })).toMatch(/\/visio\/7$/)
  })
  it('nom de salle stable, propre au rendez-vous, impossible à deviner', () => {
    expect(videoRoomName(7)).toBe(videoRoomName(7))
    expect(videoRoomName(7)).not.toBe(videoRoomName(8))
    expect(videoRoomName(7)).toMatch(/^rdv-7-[\w-]{16}$/)
  })
  it('fenêtre : 15 min avant, 30 min après ; exemple ouvert tout de suite', () => {
    const w = videoWindow('2026-12-01T09:00:00Z', '2026-12-01T09:30:00Z')
    expect(w.opensAt).toBe(Date.parse('2026-12-01T08:45:00Z'))
    expect(w.closesAt).toBe(Date.parse('2026-12-01T10:00:00Z'))
    expect(videoWindow('2026-12-01T09:00:00Z', '2026-12-01T09:30:00Z', true).opensAt).toBe(0)
  })
  it('jeton limité à la salle du rendez-vous, sans enregistrement', async () => {
    const t = await videoToken({ appointmentId: 7, identity: 'patient-1', name: 'Patient', closesAt: Date.now() + 3600e3 })
    const claims = JSON.parse(Buffer.from(t!.token.split('.')[1], 'base64url').toString())
    expect(claims.video.room).toBe(videoRoomName(7))
    expect(claims.video.roomRecord).toBeFalsy()
    expect(t!.serverUrl).toBe('wss://test.livekit.cloud')
  })
})
