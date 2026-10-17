import { describe, expect, it } from 'vitest'
import { COMMON_CRITERIA, criteriaFor, mergeCriteria } from './verification'

const names = (l: { criterion: string }[]) => l.map((c) => c.criterion)

describe('critères de qualité', () => {
  it('un lieu ouvert au public commence par le socle commun, dans l’ordre', () => {
    const c = names(criteriaFor('restaurants-gastronomie'))
    expect(c.slice(0, 6)).toEqual([...COMMON_CRITERIA])
  })
  it('les équivalents fusionnent dans le socle (pas de doublon)', () => {
    const c = names(criteriaFor('restaurants-gastronomie'))
    expect(c).not.toContain('Hygiène')
    expect(c).not.toContain('Service et accueil')
    expect(c).not.toContain('Bruit')
    expect(c).toContain('Goût')
    expect(c.filter((x) => x === 'Accessibilité')).toHaveLength(1)
  })
  it('les lieux de nature gagnent nature, environnement et climat', () => {
    const c = names(criteriaFor('culture-nature-loisirs'))
    expect(c).toContain('Nature et environnement')
    expect(c).toContain('Climat')
    expect(c).not.toContain('Sécurité')
  })
  it('un service sans lieu d’accueil ne reçoit que les critères évaluables', () => {
    const c = names(criteriaFor('maison-travaux'))
    expect(c).toContain('Accueil et respect')
    expect(c).toContain('Qualité des services')
    expect(c).not.toContain('Propreté')
    expect(c).not.toContain('Tranquillité')
  })
  it('tout est « à confirmer » à la création : aucun résultat inventé', () => {
    expect(criteriaFor('sante-soins').every((c) => c.result === 'pending')).toBe(true)
  })
  it('une fiche déjà vérifiée garde ses résultats et ses précisions', () => {
    const merged = mergeCriteria('restaurants-gastronomie', [
      { criterion: 'Hygiène', result: 'ok', note: 'Visite du 2 octobre' },
      { criterion: 'Goût', result: 'partial', note: null },
    ])
    expect(merged.find((c) => c.criterion === 'Propreté')).toMatchObject({ result: 'ok', note: 'Visite du 2 octobre' })
    expect(merged.find((c) => c.criterion === 'Goût')).toMatchObject({ result: 'partial' })
    expect(merged.find((c) => c.criterion === 'Tranquillité')).toMatchObject({ result: 'pending' })
  })
})
