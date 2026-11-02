import { describe, expect, it } from 'vitest'
import { expectedHealthCategory, needsHealthReview } from './healthCategory'

describe('D06 — catégories de santé cohérentes avec le nom', () => {
  it('vétérinaires séparés du soin humain', () => {
    expect(expectedHealthCategory('Cabinet vétérinaire Dr Bahlouli', 'Médecins')).toBe('Vétérinaires')
    expect(expectedHealthCategory('عيادة بيطرية قايس', 'Hôpitaux')).toBe('Vétérinaires')
    expect(expectedHealthCategory('Clinique Veterinaire La Soummam', 'Vétérinaires')).toBeNull()
  })
  it('médecin rangé en pharmacie', () => {
    expect(expectedHealthCategory('Dr Beddek Gynecologue', 'Pharmacies')).toBe('Médecins')
    expect(expectedHealthCategory('Clinique dentaire H24 ibn-rochd oran', 'Pharmacies')).toBe('Cliniques')
  })
  it('pharmacie rangée ailleurs', () => {
    expect(expectedHealthCategory('Pharmacie el medjed', 'Médecins')).toBe('Pharmacies')
    expect(expectedHealthCategory('Pharmacie Dr Mahious abdelghani', 'Pharmacies')).toBeNull()
    expect(expectedHealthCategory('Pharmacy de draria', 'Pharmacies')).toBeNull()
  })
  it('pas de faux positif sur « Draria » ou « Dris »', () => {
    expect(expectedHealthCategory('Pharmacie Dris', 'Pharmacies')).toBeNull()
    expect(expectedHealthCategory('Cabinet médical Draria', 'Médecins')).toBeNull()
  })
  it('matériel médical : revue humaine', () => {
    expect(needsHealthReview('SARL C.E.M - Clinique Equipement médical')).toBe(true)
    expect(expectedHealthCategory('SARL C.E.M - Clinique Equipement médical', 'Pharmacies')).toBeNull()
  })
})
