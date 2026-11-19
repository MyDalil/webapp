import { describe, expect, it } from 'vitest'
import { killSwitchUpdate, siteState } from './state'

describe('arrêt général', () => {
  it('arrête, durcit, mais n’adoucit jamais un arrêt plus fort', () => {
    expect(killSwitchUpdate('off', 'drain', 'test')).toEqual({ killSwitch: 'drain', killSwitchReason: 'test' })
    expect(killSwitchUpdate('drain', 'stop', 'x')?.killSwitch).toBe('stop')
    expect(killSwitchUpdate('stop', 'drain', 'x')).toBeNull()
    expect(killSwitchUpdate('cut', 'stop', 'x')).toBeNull()
  })
  it('état : commandes, IA, sauvegarde en retard, erreurs ; données manquantes « à vérifier »', () => {
    const now = Date.parse('2026-11-19T12:00:00Z')
    const s = siteState(
      { controls: { killSwitch: 'drain', agentsEnabled: true, telegramEnabled: true, maintenance: false, agentsMonthlyBudgetUsd: 20 }, aiConfigured: true, aiSpentMicros: 2_500_000, aiBudgetUsd: 10, lastBackup: '2026-11-17T12:00:00Z', errors: { total: 2, last: ['a', 'b'] } },
      now,
    )
    expect(s.arretGeneral).toBe('drain')
    expect(s.ia.depenseMoisUsd).toBe(2.5)
    expect(s.sauvegarde).toMatchObject({ ilYaHeures: 48, enRetard: true })
    expect(s.summary).toContain('finir puis arrêter')
    expect(s.summary).toContain('EN RETARD')
    const u = siteState({ controls: { killSwitch: 'off' }, aiConfigured: false, aiSpentMicros: null, aiBudgetUsd: 10, lastBackup: null, errors: null }, now)
    expect(u.summary).toContain('à vérifier')
    expect(u.sauvegarde.enRetard).toBe(true)
  })
})
