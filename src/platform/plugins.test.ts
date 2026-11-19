import { describe, expect, it } from 'vitest'
import { parsePlugins, pluginEnabled } from './plugins'

describe('pluginEnabled', () => {
  it('sans variable : communication seulement', () => {
    expect(pluginEnabled('communication', undefined)).toBe(true)
    expect(pluginEnabled('agents', undefined)).toBe(false)
    expect(pluginEnabled('cockpit', undefined)).toBe(false)
  })

  it('variable vide : aucun extra', () => {
    expect([...parsePlugins('')]).toEqual([])
    expect(pluginEnabled('communication', '')).toBe(false)
  })

  it('liste séparée par des virgules, espaces et casse tolérés', () => {
    expect(pluginEnabled('agents', ' Agents , cockpit')).toBe(true)
    expect(pluginEnabled('cockpit', ' Agents , cockpit')).toBe(true)
    expect(pluginEnabled('communication', ' Agents , cockpit')).toBe(false)
  })

  it('noms inconnus ignorés', () => {
    expect([...parsePlugins('agents,inconnu,,')]).toEqual(['agents'])
  })

  it('lit DALIL_PLUGINS par défaut', () => {
    const before = process.env.DALIL_PLUGINS
    process.env.DALIL_PLUGINS = 'cockpit'
    try {
      expect(pluginEnabled('cockpit')).toBe(true)
      expect(pluginEnabled('communication')).toBe(false)
    } finally {
      if (before === undefined) delete process.env.DALIL_PLUGINS
      else process.env.DALIL_PLUGINS = before
    }
  })
})
