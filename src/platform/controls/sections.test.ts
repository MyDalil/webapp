import { describe, expect, it } from 'vitest'
import { categoryKey, effectiveOff, hitOff, isSectionKey, normalizeOff, offKeyForPath, offKeyForPlace, offMessageFor, pathsForKeys, rubricKey, sectionTree, toggleOff } from './sections'

const MOSQ = categoryKey('mosquees-priere', 'Mosquées')

describe('clés des interrupteurs', () => {
  it('suivent le référentiel réel', () => {
    expect(rubricKey('musulmane')).toBe('r:musulmane')
    expect(MOSQ).toBe('c:mosquees-priere/mosquees')
    expect(isSectionKey(MOSQ)).toBe(true)
    expect(isSectionKey('r:musulmane')).toBe(true)
    expect(isSectionKey('c:inconnu/x')).toBe(false)
    expect(isSectionKey(42)).toBe(false)
  })
  it('arbre : six rubriques du menu, chaque catégorie une seule fois', () => {
    const t = sectionTree()
    expect(t.filter((n) => n.key.startsWith('r:')).map((n) => n.key)).toEqual(['r:sante', 'r:services', 'r:annonces', 'r:musulmane', 'r:decouvrir', 'r:vivre'])
    const keys = t.flatMap((n) => n.categories.map((c) => c.key))
    expect(new Set(keys).size).toBe(keys.length)
    expect(t.find((n) => n.key === 'r:musulmane')!.categories.map((c) => c.key)).toContain(MOSQ)
  })
  it('normalise et bascule (clés inconnues ignorées, sans doublon)', () => {
    expect(normalizeOff(['r:sante', 'r:sante', 'x', 3])).toEqual(['r:sante'])
    expect(normalizeOff(null)).toEqual([])
    expect(toggleOff(['r:sante'], MOSQ, true)).toEqual([MOSQ, 'r:sante'])
    expect(toggleOff([MOSQ, 'r:sante'], MOSQ, false)).toEqual(['r:sante'])
  })
})

describe('pages coupées', () => {
  it('catégorie coupée : sa page, ses pages par wilaya et sa liste filtrée', () => {
    const off = effectiveOff([MOSQ])
    expect(offKeyForPath('/annuaire/mosquees-priere/mosquees', off)).toBe(MOSQ)
    expect(offKeyForPath('/annuaire/mosquees-priere/mosquees/alger', off)).toBe(MOSQ)
    expect(offKeyForPath('/annuaire/mosquees-priere?category=Mosqu%C3%A9es', off)).toBe(MOSQ)
    expect(offKeyForPath('/annuaire/mosquees-priere/ecoles-coraniques', off)).toBeNull()
    expect(offKeyForPath('/vie-musulmane', off)).toBeNull()
    expect(offKeyForPlace('mosquees-priere', 'Mosquées', off)).toBe(MOSQ)
    expect(offKeyForPlace('sante-soins', 'Pharmacies', off)).toBeNull()
  })
  it('rubrique coupée : sa page, ses chemins et les catégories de ses secteurs', () => {
    const off = effectiveOff(['r:musulmane'])
    expect(offKeyForPath('/vie-musulmane', off)).toBe('r:musulmane')
    expect(offKeyForPath('/guides/vie-musulmane', off)).toBe('r:musulmane')
    expect(offKeyForPath('/annuaire/mosquees-priere', off)).not.toBeNull()
    expect(off.has(MOSQ)).toBe(true)
    // La correspondance la plus précise l’emporte : /guides (Découvrir) n’est pas coupé par la Vie musulmane.
    expect(offKeyForPath('/guides', off)).toBeNull()
    expect(offKeyForPath('/', off)).toBeNull()
  })
  it('rien de coupé : rien ne change', () => {
    expect(offKeyForPath('/vie-musulmane', new Set())).toBeNull()
  })
})

describe('filtre de la recherche', () => {
  const off = effectiveOff([categoryKey('sante-soins', 'Pharmacies')])
  it('retire la catégorie, ses adresses et ses liens', () => {
    expect(hitOff({ type: 'categorie', url: '/annuaire/sante-soins/pharmacies' }, off)).toBe(true)
    expect(hitOff({ type: 'adresse', url: '/adresses/pharmacie-x', subtitle: 'Pharmacies · Alger' }, off)).toBe(true)
    expect(hitOff({ type: 'adresse', url: '/adresses/labo-y', subtitle: 'Laboratoires · Alger' }, off)).toBe(false)
    expect(hitOff({ type: 'guide', url: '/guides/logement' }, off)).toBe(false)
  })
  it('rubrique coupée : ses pages sortent aussi', () => {
    expect(hitOff({ type: 'annonce', url: '/annonces/immobilier/f3-alger' }, effectiveOff(['r:annonces']))).toBe(true)
  })
})

describe('message et pages à rafraîchir', () => {
  it('message par défaut FR/EN/AR, texte saisi en français seulement', () => {
    expect(offMessageFor('fr')).toBe('Cette rubrique revient sous peu.')
    expect(offMessageFor('en')).toBe('This section is coming back soon.')
    expect(offMessageFor('ar')).toBe('هذا القسم سيعود قريبًا.')
    expect(offMessageFor('fr', ' Travaux en cours. ')).toBe('Travaux en cours.')
    expect(offMessageFor('en', 'Travaux')).toBe('This section is coming back soon.')
  })
  it('chemins concernés', () => {
    expect(pathsForKeys([MOSQ])).toEqual(['/annuaire/mosquees-priere', '/annuaire/mosquees-priere/mosquees'])
    expect(pathsForKeys(['r:musulmane'])).toContain('/vie-musulmane')
  })
})
