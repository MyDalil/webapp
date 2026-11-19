import { describe, expect, it } from 'vitest'
import { overlay, pendingFields, sourceHash, translatableFields } from './core'

describe('sourceHash', () => {
  it('stable, insensible aux espaces, sensible au texte', () => {
    expect(sourceHash('Un  café\nchaleureux ')).toBe(sourceHash('Un café chaleureux'))
    expect(sourceHash('Un café')).not.toBe(sourceHash('Un thé'))
  })
})

describe('localize (overlay)', () => {
  const doc = { id: 4, name: 'Le Tajine', address: '3 rue X', intro: 'Cuisine maison.' }
  const rows = [
    { docId: '4', field: 'intro', lang: 'en', text: 'Home cooking.', sourceHash: sourceHash('Cuisine maison.') },
    { docId: '4', field: 'name', lang: 'en', text: 'The Tagine', sourceHash: sourceHash('Le Tajine') },
    { docId: '4', field: 'address', lang: 'en', text: '3 X street' },
  ]
  it('superpose les champs traduisibles, jamais le nom ni l’adresse', () => {
    const [d] = overlay([doc], 'places', 'en', rows)
    expect(d).toEqual({ ...doc, intro: 'Home cooking.' })
    expect(doc.intro).toBe('Cuisine maison.')
  })
  it('français inchangé ; traduction périmée ignorée ; autre langue ignorée', () => {
    expect(overlay([doc], 'places', 'fr', rows)[0]).toBe(doc)
    expect(overlay([{ ...doc, intro: 'Texte modifié.' }], 'places', 'en', rows)[0].intro).toBe('Texte modifié.')
    expect(overlay([doc], 'places', 'ar', rows)[0].intro).toBe('Cuisine maison.')
  })
  it('les adresses et horaires ne sont jamais traduisibles', () => {
    for (const c of ['places', 'practitioners', 'providers', 'classifieds', 'procedures']) expect(translatableFields(c)).not.toContain('address')
  })
})

describe('pendingFields', () => {
  it('ne retraduit pas un texte inchangé', () => {
    const doc = { intro: 'Cuisine maison.' }
    expect(pendingFields(doc, 'places', 'en', [{ id: 1, docId: 4, field: 'intro', lang: 'en', text: 'x', sourceHash: sourceHash('Cuisine maison.') } as never])).toEqual([])
    const todo = pendingFields({ intro: 'Nouveau.' }, 'places', 'en', [{ id: 1, docId: 4, field: 'intro', lang: 'en', text: 'x', sourceHash: 'old' } as never])
    expect(todo).toMatchObject([{ field: 'intro', existingId: 1, hash: sourceHash('Nouveau.') }])
    expect(pendingFields({ intro: '  ' }, 'places', 'ar', [])).toEqual([])
  })
})

describe('chemins publics des fiches traduites', () => {
  it('table de correspondance du socle, /en et /ar seulement', async () => {
    const { publicPath, translatedPaths } = await import('./core')
    expect(publicPath('places', { slug: 'le-tajine' })).toBe('/adresses/le-tajine')
    expect(publicPath('practitioners', { slug: 'dr-a' })).toBe('/praticiens/dr-a')
    expect(publicPath('providers', { slug: 'p' })).toBe('/prestataires/p')
    expect(publicPath('classifieds', { slug: 'a', category: 'emploi' })).toBe('/annonces/emploi/a')
    expect(publicPath('procedures', { slug: 'passeport' })).toBe('/demarches/passeport')
    expect(publicPath('classifieds', { slug: 'a' })).toBeNull()
    expect(publicPath('inconnue', { slug: 'a' })).toBeNull()
    expect(translatedPaths('places', { slug: 'x' })).toEqual(['/en/adresses/x', '/ar/adresses/x'])
    expect(translatedPaths('places', { slug: 'x' }, ['ar'])).toEqual(['/ar/adresses/x'])
  })
  it('needsTranslation : vrai si une langue manque ou est périmée', async () => {
    const { needsTranslation } = await import('./core')
    const doc = { id: 4, intro: 'Cuisine maison.' }
    const ok = (lang: string) => ({ docId: '4', field: 'intro', lang, text: 't', sourceHash: sourceHash('Cuisine maison.') })
    expect(needsTranslation(doc, 'places', [ok('en'), ok('ar')])).toBe(false)
    expect(needsTranslation(doc, 'places', [ok('en')])).toBe(true)
    expect(needsTranslation(doc, 'places', [ok('en'), { ...ok('ar'), sourceHash: 'old' }])).toBe(true)
    expect(needsTranslation({ id: 5, intro: 'x' }, 'places', [ok('en'), ok('ar')])).toBe(true)
    expect(needsTranslation({ id: 4, intro: '' }, 'places', [])).toBe(false)
  })
})
