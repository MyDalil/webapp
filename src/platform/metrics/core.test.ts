import { describe, expect, it } from 'vitest'
import { isBot, memoryLimiter, parseBeacon, totalsOf, visibilityText } from './core'

describe('beacon de mesure', () => {
  it('accepte seulement les collections et types de la liste blanche', () => {
    expect(parseBeacon({ c: 'places', i: '42', k: 'view' })).toEqual({ target: { collection: 'places', id: '42' }, kind: 'view' })
    expect(parseBeacon({ c: 'providers', i: 7, k: 'call' })?.target.id).toBe('7')
    expect(parseBeacon({ c: 'members', i: '1', k: 'view' })).toBeNull()
    expect(parseBeacon({ c: 'places', i: '1', k: 'lead' })).toBeNull()
    expect(parseBeacon({ c: 'places', i: '1; DROP', k: 'view' })).toBeNull()
    expect(parseBeacon({ c: 'places', i: '0', k: 'view' })).toBeNull()
    expect(parseBeacon(null)).toBeNull()
  })
  it('ignore les robots et les aperçus de liens', () => {
    expect(isBot('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(true)
    expect(isBot('WhatsApp/2.23.20.0')).toBe(true)
    expect(isBot(null)).toBe(true)
    expect(isBot('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1')).toBe(false)
  })
  it('limite le débit en mémoire par fenêtre', () => {
    const limited = memoryLimiter(2, 1000)
    expect([limited('a', 0), limited('a', 1), limited('a', 2)]).toEqual([false, false, true])
    expect(limited('b', 2)).toBe(false)
    expect(limited('a', 1001)).toBe(false)
  })
})

describe('rapport de visibilité', () => {
  it('donne un texte prêt à envoyer avec les totaux', () => {
    const t = totalsOf({ views: 120, calls: 4, whatsapp: 2, directions: 9, shares: 0, leads: 1 })
    const txt = visibilityText('Pizzeria Amir', t, 30)
    expect(txt).toContain('« Pizzeria Amir »')
    expect(txt).toContain('30 derniers jours')
    expect(txt).toContain('120 vues')
    expect(txt).toContain('4 appels')
    expect(txt).toContain('1 demande reçue')
    expect(txt).toContain('16 prises de contact')
    expect(txt).not.toContain('partage')
  })
  it('valeurs absentes = 0', () => {
    expect(totalsOf(undefined)).toEqual({ views: 0, calls: 0, whatsapp: 0, directions: 0, shares: 0, leads: 0 })
    expect(visibilityText('X', totalsOf(undefined), 7)).toContain('Aucune prise de contact')
  })
})
