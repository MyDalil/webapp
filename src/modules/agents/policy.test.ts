import { describe, expect, it } from 'vitest'
import { DEFAULT_MODES, decide, HARD_FORBIDDEN } from './policy'

const base = { killSwitch: 'off' as const, texts: [] as string[] }

describe('politique d’autonomie des agents', () => {
  it('mode mixte par défaut : tâches sans risque exécutées, le reste proposé', () => {
    expect(DEFAULT_MODES['translate']).toBe('execute')
    expect(DEFAULT_MODES['write-alt-text']).toBe('execute')
    expect(DEFAULT_MODES['suggest-tags']).toBe('execute')
    expect(DEFAULT_MODES['fix-broken-links']).toBe('execute')
    expect(DEFAULT_MODES['draft-content']).toBe('propose')
    expect(DEFAULT_MODES['draft-email']).toBe('propose')
    expect(DEFAULT_MODES['draft-telegram']).toBe('propose')
  })

  it('le réglage Neon de l’agent prime sur le défaut', () => {
    expect(decide({ ...base, tool: 'translate', agentModes: { translate: 'propose' } }).mode).toBe('propose')
    expect(decide({ ...base, tool: 'draft-content', agentModes: { 'draft-content': 'execute' } }).mode).toBe('execute')
  })

  it('les interdictions dures ne se lèvent jamais, même réglées « exécute »', () => {
    for (const tool of HARD_FORBIDDEN) {
      const d = decide({ ...base, tool, agentModes: { [tool]: 'execute' } })
      expect(d).toEqual({ mode: 'deny', reason: 'interdit' })
    }
  })

  it('Vie musulmane : refus quel que soit l’outil', () => {
    expect(decide({ ...base, tool: 'translate', texts: ['Fiche : horaires de la Vie musulmane'] })).toEqual({ mode: 'deny', reason: 'vie-musulmane' })
    expect(decide({ ...base, tool: 'draft-content', texts: ['Préparer le guide Omra 2027'] }).mode).toBe('deny')
  })

  it('arrêt général « arrêter » ou « tout couper » : refus', () => {
    expect(decide({ ...base, tool: 'translate', killSwitch: 'stop' })).toEqual({ mode: 'deny', reason: 'arret-general' })
    expect(decide({ ...base, tool: 'translate', killSwitch: 'cut' }).mode).toBe('deny')
    expect(decide({ ...base, tool: 'translate', killSwitch: 'drain' }).mode).toBe('execute')
  })

  it('un outil inconnu est refusé', () => {
    expect(decide({ ...base, tool: 'outil-invente' })).toEqual({ mode: 'deny', reason: 'outil-inconnu' })
  })

  it('« interdit » réglé dans Neon : refus', () => {
    expect(decide({ ...base, tool: 'web-search', agentModes: { 'web-search': 'forbidden' } })).toEqual({ mode: 'deny', reason: 'reglage' })
  })
})
