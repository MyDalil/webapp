import { describe, expect, it } from 'vitest'
import { filterPlaces, NATURE_CATEGORIES, verifiedCriteria } from './filters'

const place = (o: { slug: string } & Partial<Parameters<typeof filterPlaces>[0][number]>) => ({
  name: 'Lieu', category: 'Musées', city: 'Alger', wilaya: 'Alger', sector: 'culture-nature-loisirs', sectorTitle: 'Culture', place: '', status: 'spotted' as const, languages: [], updated: '2026-01-01', favorite: false, verified: [] as string[], ...o,
})

const list = [
  place({ slug: 'jardin-essai', name: 'Jardin d’Essai', category: 'Jardins', wilaya: 'Alger', verified: ['Propreté', 'Accessibilité'] }),
  place({ slug: 'musee-bardo', name: 'Musée du Bardo', category: 'Musées', wilaya: 'Alger', favorite: true, verified: ['Propreté'] }),
  place({ slug: 'el-kala', name: 'Parc national d’El-Kala', category: 'Parcs naturels et réserves', city: 'El Kala', wilaya: 'El Tarf' }),
  place({ slug: 'santa-cruz', name: 'Santa Cruz', category: 'Monuments et sites historiques', city: 'Oran', wilaya: 'Oran', favorite: true }),
]
const slugs = (f: Parameters<typeof filterPlaces>[1]) => filterPlaces(list, f).map((p) => p.slug)

describe('filtres de l’annuaire', () => {
  it('sans filtre, tout est montré', () => {
    expect(slugs({})).toEqual(['jardin-essai', 'musee-bardo', 'el-kala', 'santa-cruz'])
  })
  it('la wilaya choisie ne garde que ses lieux', () => {
    expect(slugs({ wilaya: 'Alger' })).toEqual(['jardin-essai', 'musee-bardo'])
  })
  it('le thème nature ne garde que parcs, plages, cascades, lacs et jardins', () => {
    expect(slugs({ theme: 'nature' })).toEqual(['jardin-essai', 'el-kala'])
    expect(NATURE_CATEGORIES).toContain('Plages')
  })
  it('wilaya et nature se combinent', () => {
    expect(slugs({ theme: 'nature', wilaya: 'El Tarf' })).toEqual(['el-kala'])
  })
  it('la recherche ignore accents et majuscules, et lit aussi la wilaya', () => {
    expect(slugs({ q: 'musee' })).toEqual(['musee-bardo'])
    expect(slugs({ q: 'el tarf' })).toEqual(['el-kala'])
  })
  it('une catégorie précise reste prioritaire sur le thème', () => {
    expect(slugs({ theme: 'nature', category: 'Jardins' })).toEqual(['jardin-essai'])
  })
  it('les coups de cœur ne gardent que la sélection de l’équipe', () => {
    expect(slugs({ favorite: true })).toEqual(['musee-bardo', 'santa-cruz'])
    expect(slugs({ favorite: true, wilaya: 'Oran' })).toEqual(['santa-cruz'])
  })
  it('un critère choisi ne garde que les lieux où il est vérifié conforme ; plusieurs se cumulent', () => {
    expect(slugs({ criteria: ['Propreté'] })).toEqual(['jardin-essai', 'musee-bardo'])
    expect(slugs({ criteria: ['Propreté', 'Accessibilité'] })).toEqual(['jardin-essai'])
  })
  it('la liste des critères proposés ne montre que ceux vérifiés quelque part', () => {
    expect(verifiedCriteria(list)).toEqual(['Accessibilité', 'Propreté'])
  })
})
