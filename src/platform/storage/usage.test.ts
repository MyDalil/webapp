import { describe, expect, it } from 'vitest'
import { idsInDoc, mediaRefs, replaceInDoc } from './usage'

const FIELDS = [
  { type: 'text', name: 'name' },
  { type: 'upload', name: 'photo', relationTo: 'media' },
  { type: 'relationship', name: 'author', relationTo: 'members' },
  { type: 'row', fields: [{ type: 'upload', name: 'cover', relationTo: 'media' }] },
  { type: 'tabs', tabs: [
    { fields: [{ type: 'upload', name: 'photos', relationTo: 'media', hasMany: true }] },
    { name: 'seo', fields: [{ type: 'upload', name: 'og', relationTo: 'media' }, { type: 'text', name: 'title' }] },
  ] },
  { type: 'group', name: 'media', fields: [{ type: 'upload', name: 'logo', relationTo: 'media' }, { type: 'text', name: 'caption' }] },
  { type: 'array', name: 'steps', fields: [{ type: 'text', name: 'label' }, { type: 'upload', name: 'image', relationTo: 'media' }] },
]

describe('photos : champs qui les citent', () => {
  it('trouve les champs à tous les niveaux, avec leur chemin de requête', () => {
    expect(mediaRefs('places', FIELDS)).toEqual([
      { collection: 'places', path: 'photo', hasMany: false },
      { collection: 'places', path: 'cover', hasMany: false },
      { collection: 'places', path: 'photos', hasMany: true },
      { collection: 'places', path: 'seo.og', hasMany: false },
      { collection: 'places', path: 'media.logo', hasMany: false },
      { collection: 'places', path: 'steps.image', hasMany: false },
    ])
  })

  it('ignore les relations vers d’autres collections', () => {
    expect(mediaRefs('x', [{ type: 'relationship', name: 'a', relationTo: 'members' }])).toEqual([])
  })
})

const DOC = {
  name: 'Café', photo: 1, author: 1, cover: { id: 2 }, photos: [3, 1, 4],
  seo: { og: 1, title: 'T' }, media: { logo: 5, caption: 'C' }, steps: [{ label: 'a', image: 1 }, { label: 'b', image: 6 }],
}

describe('photos : identifiants cités par un document', () => {
  it('collecte tous les identifiants, objets compris', () => {
    expect([...idsInDoc(FIELDS, DOC)].sort()).toEqual(['1', '2', '3', '4', '5', '6'])
  })
})

describe('photos : remplacer partout', () => {
  it('remplace à chaque niveau et garde les champs voisins', () => {
    expect(replaceInDoc(FIELDS, DOC, 1, 9)).toEqual({
      photo: 9, photos: [3, 9, 4], seo: { og: 9, title: 'T' }, steps: [{ label: 'a', image: 9 }, { label: 'b', image: 6 }],
    })
  })

  it('pas de doublon dans un champ multiple', () => {
    expect(replaceInDoc(FIELDS, { photos: [3, 1, 4] }, 1, 3)).toEqual({ photos: [3, 4] })
  })

  it('accepte un identifiant sous forme d’objet', () => {
    expect(replaceInDoc(FIELDS, DOC, 2, 7)).toEqual({ cover: 7 })
  })

  it('rien à remplacer : null', () => {
    expect(replaceInDoc(FIELDS, DOC, 42, 9)).toBeNull()
  })

  it('ne touche pas une relation vers un compte qui porte le même numéro', () => {
    expect(replaceInDoc(FIELDS, DOC, 1, 9)).not.toHaveProperty('author')
  })
})
