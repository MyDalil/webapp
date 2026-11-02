import { describe, expect, it } from 'vitest'
import { missingProof, nextCheck, requireProof } from './verification'

const base = { verification: 'verified', verifiedAt: '2026-10-01', verifiedBy: 'Équipe DALIL', sources: [{ url: 'https://www.joradp.dz/x' }], criteria: [{ result: 'ok' }] }

describe('A07 — « Vérifiée » exige des preuves', () => {
  it('accepte une vérification complète', () => expect(missingProof(base)).toEqual([]))
  it('refuse sans date, sans auteur, sans source, sans critère', () => {
    expect(missingProof({ ...base, verifiedAt: null })).toContain('date de vérification')
    expect(missingProof({ ...base, verifiedBy: ' ' })).toContain('auteur de la vérification')
    expect(missingProof({ ...base, sources: [] })).toContain('au moins une source exploitable (lien)')
    expect(missingProof({ ...base, sources: [{ url: 'à voir' }] })).toContain('au moins une source exploitable (lien)')
    expect(missingProof({ ...base, criteria: [] })).toContain('critères du secteur')
  })
  it('label : tous les critères évalués, aucun non conforme', () => {
    expect(missingProof({ ...base, verification: 'labelled', criteria: [{ result: 'pending' }] })).toHaveLength(1)
    expect(missingProof({ ...base, verification: 'labelled', criteria: [{ result: 'ok' }, { result: 'na' }] })).toEqual([])
  })
  it('« À vérifier » n’exige rien', () => expect(missingProof({ verification: 'spotted' })).toEqual([]))
  it('mise à jour partielle : contrôle sur la fiche complète', () => {
    expect(() => requireProof({ data: { verification: 'verified' }, originalDoc: { verification: 'spotted' } } as never)).toThrow(/refusé/)
    const data: Record<string, unknown> = { verifiedBy: 'Rad' }
    requireProof({ data, originalDoc: { ...base, verifiedBy: null } } as never)
    expect(data.nextVerificationAt).toBe(nextCheck('2026-10-01'))
  })
})
