import { describe, expect, it } from 'vitest'
import { QUEUES, actionFor, itemTitle, opLabel, sameOrigin } from './validation'

describe('vue Validation', () => {
  it('une seule file couvre fiches, revendications, abonnements, paiements, contributions', () => {
    expect(QUEUES.map((q) => q.key)).toEqual(['places', 'practitioners', 'providers', 'classifieds', 'procedures', 'claims', 'subscriptions', 'payments', 'submissions'])
  })
  it('chaque bouton passe par une action du registre', () => {
    expect(actionFor('places', 'publier', 3)).toEqual({ name: 'publier_fiche', input: { collection: 'places', id: 3 } })
    expect(actionFor('classifieds', 'rejeter', 3, 'hors sujet')).toEqual({ name: 'rejeter_fiche', input: { collection: 'classifieds', id: 3, motif: 'hors sujet' } })
    expect(actionFor('claims', 'activer', 4)).toEqual({ name: 'decider_revendication', input: { id: 4, decision: 'acceptee' } })
    expect(actionFor('subscriptions', 'activer', 5, 'CCP 123')).toEqual({ name: 'activer_abonnement', input: { id: 5, note: 'CCP 123' } })
    expect(actionFor('payments', 'rejeter', 6)).toEqual({ name: 'valider_paiement', input: { id: 6, annuler: true } })
  })
  it('opérations inconnues refusées', () => {
    expect(actionFor('submissions', 'publier', 1)).toBeNull()
    expect(actionFor('users', 'publier', 1)).toBeNull()
    expect(actionFor('places', 'activer', 1)).toBeNull()
    expect(actionFor('places', 'publier', 0)).toBeNull()
    expect(actionFor('places', 'publier', Number.NaN)).toBeNull()
  })
  it('libellés et titres', () => {
    expect(opLabel(QUEUES.find((q) => q.key === 'payments')!, 'activer')).toBe('Reçu')
    expect(itemTitle('payments', { id: 1, amount: 150000, currency: 'DZD', provider: 'ccp' })).toMatch(/1\s?500 DZD — ccp/)
    expect(itemTitle('places', { id: 2, name: 'Café' })).toBe('Café')
    expect(itemTitle('claims', { id: 3, targetCollection: 'places', targetId: '8' })).toBe('Fiche places n° 8')
  })
  it('anti-CSRF : même origine seulement', () => {
    expect(sameOrigin(null, 'https://www.mydalil.com/api/validation')).toBe(true)
    expect(sameOrigin('https://www.mydalil.com', 'https://www.mydalil.com/api/validation')).toBe(true)
    expect(sameOrigin('https://evil.example', 'https://www.mydalil.com/api/validation')).toBe(false)
  })
})
