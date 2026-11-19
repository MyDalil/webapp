import { describe, expect, it } from 'vitest'
import { kitEligible, kitPath } from './kitRules'

describe('kit « Vérifié sur DALIL »', () => {
  it('adresse : seulement « Vérifiée » ou « Labellisée », publiée, datée', () => {
    const base = { slug: 'a', _status: 'published', verifiedAt: '2026-10-01' }
    expect(kitEligible('places', { ...base, verification: 'verified' })).toBe(true)
    expect(kitEligible('places', { ...base, verification: 'labelled' })).toBe(true)
    expect(kitEligible('places', { ...base, verification: 'checking' })).toBe(false)
    expect(kitEligible('places', { ...base, verification: 'verified', verifiedAt: null })).toBe(false)
    expect(kitEligible('places', { ...base, verification: 'verified', _status: 'draft' })).toBe(false)
  })
  it('praticien : identité et diplôme vérifiés', () => {
    const base = { slug: 'p', status: 'published', identityVerified: true }
    expect(kitEligible('practitioners', { ...base, diplomas: [{ verified: true }] })).toBe(true)
    expect(kitEligible('practitioners', { ...base, diplomas: [{ verified: false }] })).toBe(false)
  })
  it('prestataire : identité et statut légal vérifiés', () => {
    expect(kitEligible('providers', { slug: 'x', status: 'published', identityVerified: true, legalVerified: true })).toBe(true)
    expect(kitEligible('providers', { slug: 'x', status: 'published', identityVerified: true, legalVerified: false })).toBe(false)
  })
  it('annonce ou collection inconnue : jamais', () => {
    expect(kitEligible('classifieds', { slug: 'x', status: 'published' })).toBe(false)
    expect(kitEligible('members', { slug: 'x' })).toBe(false)
  })
  it('adresse publique de la fiche', () => {
    expect(kitPath('places', 'pharmacie-x')).toBe('/adresses/pharmacie-x')
  })
})
