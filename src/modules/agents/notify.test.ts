import { describe, expect, it } from 'vitest'
import { channelsFor, DEFAULT_NOTIFY, formatNotification, phaseOf } from './notify'

describe('notifications des agents', () => {
  it('défauts de la décision de Rad : avant / pendant / après', () => {
    expect(DEFAULT_NOTIFY.before).toEqual(['admin', 'telegram_said', 'telegram_rad'])
    expect(DEFAULT_NOTIFY.during).toEqual(['admin'])
    expect(DEFAULT_NOTIFY.after).toEqual(['admin', 'telegram_said', 'telegram_rad', 'email'])
  })

  it('le fil de l’admin reçoit toujours la notification, même si le réglage l’oublie', () => {
    expect(channelsFor('after', { after: ['email'] })).toEqual(['admin', 'email'])
    expect(channelsFor('during', {})).toEqual(['admin'])
  })

  it('phase selon le changement d’état de la tâche', () => {
    expect(phaseOf({ status: 'new' }, { status: 'running', steps: 0 })).toBe('before')
    expect(phaseOf({ status: 'running', steps: 2 }, { status: 'running', steps: 3 })).toBe('during')
    expect(phaseOf({ status: 'running', steps: 3 }, { status: 'review', steps: 3 })).toBe('after')
    expect(phaseOf({ status: 'running' }, { status: 'failed' })).toBe('after')
    expect(phaseOf({ status: 'running' }, { status: 'paused' })).toBe('order')
    expect(phaseOf({ status: 'review' }, { status: 'done' })).toBe('after')
    expect(phaseOf(undefined, { status: 'new' })).toBe('order')
    expect(phaseOf({ status: 'running', steps: 3 }, { status: 'running', steps: 3 })).toBeNull()
  })

  it('texte court, avec l’action_id et le lien vers le travail', () => {
    const txt = formatNotification({ phase: 'after', agent: 'Editorial', title: 'Horaires des musées d’Oran', actionId: 'act_x', link: 'https://www.mydalil.com/admin/collections/agent-tasks/12' })
    expect(txt).toBe('Après · Editorial\nHoraires des musées d’Oran\nTravail : https://www.mydalil.com/admin/collections/agent-tasks/12\nact_x')
  })
})
