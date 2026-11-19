import { describe, expect, it } from 'vitest'
import { claimDecisionError, claimDocumentError } from './claimsCore'

describe('revendications', () => {
  it('fiche déjà rattachée à un autre compte : refus clair', () => {
    expect(claimDecisionError({ status: 'en_attente', decision: 'acceptee', memberId: 4, currentOwner: { id: 7 } })).toMatch(/déjà rattachée/)
    expect(claimDecisionError({ status: 'en_attente', decision: 'acceptee', memberId: 4, currentOwner: 4 })).toBeNull()
    expect(claimDecisionError({ status: 'en_attente', decision: 'acceptee', memberId: 4, currentOwner: null })).toBeNull()
    expect(claimDecisionError({ status: 'en_attente', decision: 'refusee', memberId: 4, currentOwner: 7 })).toBeNull()
  })
  it('une décision ne se rejoue pas', () => {
    expect(claimDecisionError({ status: 'acceptee', decision: 'refusee', memberId: 4, currentOwner: 4 })).toMatch(/déjà/)
    expect(claimDecisionError({ status: 'en_attente', decision: 'peut-etre', memberId: 4, currentOwner: null })).toMatch(/inconnue/)
  })
  it('pièce : PDF, JPG, PNG, 5 Mo au plus', () => {
    expect(claimDocumentError({ mimetype: 'application/pdf', size: 1000 })).toBeNull()
    expect(claimDocumentError({ mimetype: 'image/gif', size: 1000 })).toMatch(/PDF/)
    expect(claimDocumentError({ mimetype: 'image/png', size: 5 * 1024 * 1024 + 1 })).toMatch(/5 Mo/)
    expect(claimDocumentError({ mimetype: 'image/jpeg', size: 0 })).toMatch(/vide/)
  })
})
