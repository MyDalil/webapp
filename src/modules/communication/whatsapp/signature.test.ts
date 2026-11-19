import { createHmac } from 'crypto'
import { describe, expect, it } from 'vitest'
import { messagesOf, verifyChallenge, verifySignature } from './signature'

const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: { messages: [{ from: '213555123456', id: 'wamid.1', type: 'text', text: { body: 'salam' } }], statuses: [] } }] }] })
const sign = (b: string, s: string) => `sha256=${createHmac('sha256', s).update(b).digest('hex')}`

describe('signature WhatsApp (X-Hub-Signature-256)', () => {
  it('accepte la bonne signature', () => {
    expect(verifySignature(body, sign(body, 'app-secret'), 'app-secret')).toBe(true)
    expect(verifySignature(new TextEncoder().encode(body), sign(body, 'app-secret'), 'app-secret')).toBe(true)
  })
  it('refuse corps modifié, mauvais secret, en-tête absent ou mal formé, secret non configuré', () => {
    expect(verifySignature(`${body} `, sign(body, 'app-secret'), 'app-secret')).toBe(false)
    expect(verifySignature(body, sign(body, 'autre'), 'app-secret')).toBe(false)
    expect(verifySignature(body, null, 'app-secret')).toBe(false)
    expect(verifySignature(body, 'sha1=abcd', 'app-secret')).toBe(false)
    expect(verifySignature(body, 'sha256=zz', 'app-secret')).toBe(false)
    expect(verifySignature(body, sign(body, 'app-secret'), undefined)).toBe(false)
  })
  it('vérification GET du webhook', () => {
    const ok = new URLSearchParams({ 'hub.mode': 'subscribe', 'hub.verify_token': 'jeton', 'hub.challenge': '123' })
    expect(verifyChallenge(ok, 'jeton')).toBe('123')
    expect(verifyChallenge(ok, 'autre')).toBeNull()
    expect(verifyChallenge(ok, undefined)).toBeNull()
  })
  it('extrait les messages, ignore le reste', () => {
    expect(messagesOf(JSON.parse(body))).toHaveLength(1)
    expect(messagesOf({ object: 'page', entry: [] })).toEqual([])
    expect(messagesOf(null)).toEqual([])
  })
})
