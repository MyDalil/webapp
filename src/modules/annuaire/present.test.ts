import { describe, expect, it } from 'vitest'
import { factsOf, presentIntro } from './present'

describe('presentIntro', () => {
  it('retire la mention de provenance et reformule la wilaya', () => {
    expect(presentIntro('École coranique à Aïn Djasser (wilaya de Batna). Informations issues d’OpenStreetMap, à vérifier par DALIL.')).toBe('École coranique à Aïn Djasser, dans la wilaya de Batna.')
  })
  it('garde un texte rédigé', () => {
    expect(presentIntro('Plus ancienne mosquée d’Alger.')).toBe('Plus ancienne mosquée d’Alger.')
  })
})

describe('factsOf', () => {
  it('ne montre que le connu', () => {
    const f = factsOf({ category: 'Mosquées', heritage: null, inception: '1097', intro: 'Mosquée à Alger. Géré par Ministère. Accès en fauteuil roulant signalé.', criteria: [{ criterion: 'Propreté', result: 'pending' }] as never })
    expect(f.map((x) => x.label)).toEqual(['Catégorie', 'Création', 'Accès fauteuil', 'Gestion'])
  })
  it('retire du texte ce qui est déjà dans « En bref »', () => {
    expect(presentIntro('École coranique à Batna (wilaya de Batna). Géré par APC. Accès en fauteuil roulant signalé. Informations issues d’OpenStreetMap, à vérifier par DALIL.')).toBe('École coranique à Batna, dans la wilaya de Batna.')
  })
  it('les faits relevés priment sur les champs génériques', () => {
    const f = factsOf({ category: 'Mosquées', heritage: 'Partie d’un site', inception: null, intro: null, criteria: [], facts: [{ label: 'Patrimoine', value: 'UNESCO, 1992' }] } as never)
    expect(f.find((x) => x.label === 'Patrimoine')?.value).toBe('UNESCO, 1992')
  })
})
