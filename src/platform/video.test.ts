import { afterEach, describe, expect, it } from 'vitest'
import { createVideoRoom, videoEnabled } from './video'

describe('A12 — visio seulement avec un fournisseur implémenté', () => {
  afterEach(() => { delete process.env.VIDEO_PROVIDER })
  it('une variable non vide ne suffit pas', async () => {
    process.env.VIDEO_PROVIDER = 'livekit'
    expect(videoEnabled()).toBe(false)
    expect(await createVideoRoom({ appointmentId: 1, start: '', end: '' })).toBeNull()
  })
})
