import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ActionDef } from '@/platform/actions/types'
import { vi } from 'vitest'
vi.mock('@/platform/monitoring/errors', () => ({ recordError: async () => {} }))
import { readCallback, signCallback, signingSecret, verifyCallback } from '@/platform/telegram/callback'
import { addressedToBot, fitInput, formatResults, looksLikeContribution, parseAiChoice, parseRemote, resolveAction, textInput, toE164 } from './parse'

const def = (name: string, input: Record<string, unknown> = { type: 'object', properties: { q: { type: 'string' } } }, extra: Partial<ActionDef> = {}): ActionDef => ({ name, title: name, description: '', module: 'test', access: 'public', readOnly: true, input, run: async () => null, ...extra })

describe('commandes de la télécommande', () => {
  it('texte libre = langage naturel', () => {
    expect(parseRemote('ajoute la pharmacie Benali à Oran')).toEqual({ kind: 'texte', text: 'ajoute la pharmacie Benali à Oran' })
  })
  it('commandes simples avec argument', () => {
    expect(parseRemote('/chercher pharmacie de garde Oran')).toEqual({ kind: 'action', cmd: 'chercher', args: 'pharmacie de garde Oran' })
    expect(parseRemote('/chercher@DalilBot dentiste', 'DalilBot')).toEqual({ kind: 'action', cmd: 'chercher', args: 'dentiste' })
    expect(parseRemote('/controle')).toEqual({ kind: 'action', cmd: 'controle', args: '' })
    expect(parseRemote('/chercher')).toMatchObject({ kind: 'erreur' })
  })
  it('publier, rejeter, corriger : référence obligatoire, motif obligatoire pour rejeter', () => {
    expect(parseRemote('/publier 12')).toEqual({ kind: 'publier', ref: '12' })
    expect(parseRemote('/rejeter 7 source trop ancienne')).toEqual({ kind: 'rejeter', ref: '7', motif: 'source trop ancienne' })
    expect(parseRemote('/rejeter 7')).toMatchObject({ kind: 'erreur' })
    expect(parseRemote('/publier')).toMatchObject({ kind: 'erreur' })
    expect(parseRemote('/corriger 3f2a-11 horaires 8h-17h')).toEqual({ kind: 'corriger', ref: '3f2a-11', text: 'horaires 8h-17h' })
  })
  it('défi wilaya, aide, start, inconnue', () => {
    expect(parseRemote('/defi Oran pharmacies de garde')).toEqual({ kind: 'defi', wilaya: 'Oran', theme: 'pharmacies de garde' })
    expect(parseRemote('/defi Oran')).toMatchObject({ kind: 'erreur' })
    expect(parseRemote('/aide')).toEqual({ kind: 'aide' })
    expect(parseRemote('/start')).toEqual({ kind: 'start' })
    expect(parseRemote('/valider 12')).toMatchObject({ kind: 'erreur' })
  })
  it('groupe : le bot répond seulement à une mention ou à /chercher', () => {
    expect(addressedToBot('/chercher dentiste', 'DalilBot')).toBe(true)
    expect(addressedToBot('@dalilbot une pharmacie à Blida ?', 'DalilBot')).toBe(true)
    expect(addressedToBot('bonjour à tous', 'DalilBot')).toBe(false)
  })
  it('contribution de visiteur reconnue', () => {
    expect(looksLikeContribution('Ajoutez cette pharmacie : …')).toBe(true)
    expect(looksLikeContribution('pharmacie de garde Oran')).toBe(false)
  })
})

describe('choix et remplissage des actions', () => {
  const actions = [def('rechercher'), def('voir_fiche', { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] }), def('publier_brouillon', { type: 'object', properties: { actionId: { type: 'string' } } })]
  it('nom exact puis préfixe', () => {
    expect(resolveAction(actions, ['rechercher', 'chercher'])?.name).toBe('rechercher')
    expect(resolveAction(actions, ['publier'])?.name).toBe('publier_brouillon')
    expect(resolveAction(actions, ['controle'])).toBeNull()
  })
  it('entrée limitée au schéma, texte dans le champ texte', () => {
    expect(fitInput(actions[2], { actionId: 'a-1', id: 4, motif: 'x' })).toEqual({ actionId: 'a-1' })
    expect(textInput(actions[0], 'dentiste Alger')).toEqual({ q: 'dentiste Alger' })
    expect(textInput(actions[1], '123')).toEqual({ id: '123' })
  })
  it('réponse publique : 3 résultats avec liens', () => {
    const r = formatResults({ results: [1, 2, 3, 4].map((i) => ({ title: `Fiche ${i}`, path: `/adresse/${i}` })) }, 'https://www.mydalil.com')
    expect(r).toContain('https://www.mydalil.com/adresse/3')
    expect(r).not.toContain('Fiche 4')
  })
  it('sortie IA : JSON strict, action autorisée seulement', () => {
    expect(parseAiChoice('{"action":"rechercher","input":{"q":"x"}}', ['rechercher'])).toEqual({ action: 'rechercher', input: { q: 'x' } })
    expect(parseAiChoice('{"action":"supprimer_tout","input":{}}', ['rechercher'])).toBeNull()
    expect(parseAiChoice('pas du JSON', ['rechercher'])).toBeNull()
    expect(parseAiChoice('{"action":null,"reply":"Quelle wilaya ?"}', ['rechercher'])).toEqual({ action: null, reply: 'Quelle wilaya ?' })
  })
  it('numéro WhatsApp en E.164', () => {
    expect(toE164('213555123456')).toBe('+213555123456')
  })
})

describe('boutons signés', () => {
  const old = process.env.REMOTE_SIGNING_SECRET
  beforeEach(() => { process.env.REMOTE_SIGNING_SECRET = 'secret-de-test' })
  afterEach(() => { process.env.REMOTE_SIGNING_SECRET = old })
  it('aller-retour, 64 octets au plus avec un UUID', () => {
    const id = crypto.randomUUID()
    const data = signCallback('p', id)!
    expect(Buffer.byteLength(data)).toBeLessThanOrEqual(64)
    expect(verifyCallback(data)).toEqual({ op: 'p', ref: id })
  })
  it('falsifié, opération changée ou autre secret : refusé', () => {
    const data = signCallback('r', '42')!
    expect(verifyCallback(data.replace(/^r/, 'p'))).toBeNull()
    expect(verifyCallback(`${data.slice(0, -1)}${data.endsWith('A') ? 'B' : 'A'}`)).toBeNull()
    process.env.REMOTE_SIGNING_SECRET = 'autre'
    expect(verifyCallback(data)).toBeNull()
  })
  it('référence invalide : pas de bouton', () => {
    expect(signCallback('p', 'a.b')).toBeNull()
  })
  it('horodatage signé : valable 7 jours, puis « expire » ; horodatage modifié = invalide', () => {
    const t0 = 1_800_000_000
    const data = signCallback('x', 'h-drain', t0)!
    expect(readCallback(data, t0 + 7 * 86400 - 1)).toMatchObject({ ok: true, op: 'x', ref: 'h-drain', at: t0 })
    expect(readCallback(data, t0 + 7 * 86400 + 1)).toEqual({ ok: false, reason: 'expire' })
    const parts = data.split('.')
    parts[2] = (t0 + 100).toString(36)
    expect(readCallback(parts.join('.'), t0)).toEqual({ ok: false, reason: 'invalide' })
  })
  it('production : REMOTE_SIGNING_SECRET dédié (32 caractères) obligatoire, jamais PAYLOAD_SECRET', () => {
    expect(signingSecret({ VERCEL_ENV: 'production', PAYLOAD_SECRET: 'p'.repeat(40) })).toBe('')
    expect(signingSecret({ VERCEL_ENV: 'production', REMOTE_SIGNING_SECRET: 'court' })).toBe('')
    expect(signingSecret({ VERCEL_ENV: 'production', REMOTE_SIGNING_SECRET: 's'.repeat(32) })).toBe('s'.repeat(32))
    expect(signingSecret({ VERCEL_ENV: 'preview', PAYLOAD_SECRET: 'payload' })).toBe('payload')
  })
})
