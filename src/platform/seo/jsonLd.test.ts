import { describe, expect, it } from 'vitest'
import { breadcrumbJsonLd, classifiedJsonLd, classifiedType, clean, medicalSpecialties, placeJsonLd, placeType, practitionerJsonLd, procedureJsonLd, providerJsonLd, serializeJsonLd } from './jsonLd'

const url = 'https://www.mydalil.com/adresses/x'

describe('placeType', () => {
  it('choisit le type schema.org selon la catégorie du référentiel', () => {
    expect(placeType('Mosquées')).toBe('Mosque')
    expect(placeType('Écoles primaires')).toBe('ElementarySchool')
    expect(placeType('Hôpitaux')).toBe('Hospital')
    expect(placeType('Pharmacies')).toBe('Pharmacy')
    expect(placeType('Ministères')).toBe('GovernmentOffice')
    expect(placeType('Ambassades')).toBe('Embassy')
    expect(placeType('Consulats')).toBe('Embassy')
    expect(placeType('Monuments et sites historiques')).toBe('TouristAttraction')
  })
  it('retombe sur LocalBusiness', () => {
    expect(placeType('Catégorie inconnue')).toBe('LocalBusiness')
    expect(placeType(null)).toBe('LocalBusiness')
  })
})

describe('placeJsonLd', () => {
  it('n’émet que les champs présents', () => {
    const ld = placeJsonLd({ name: 'Grande Mosquée', url, lang: 'fr', category: 'Mosquées', address: { locality: 'Alger' }, phone: null, website: '', images: [], hours: [] })
    expect(ld).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Mosque',
      '@id': `${url}#lieu`,
      name: 'Grande Mosquée',
      url,
      address: { '@type': 'PostalAddress', addressLocality: 'Alger', addressCountry: 'DZ' },
      inLanguage: 'fr-DZ',
    })
    expect(ld).not.toHaveProperty('telephone')
    expect(ld).not.toHaveProperty('geo')
    expect(ld).not.toHaveProperty('aggregateRating')
  })
  it('remplit adresse, coordonnées, téléphone, site officiel et horaires', () => {
    const ld = placeJsonLd({ name: 'Pharmacie', url, lang: 'ar', category: 'Pharmacies', address: { street: '12 rue Didouche', locality: 'Alger', region: 'Alger' }, pos: [36.75, 3.05], phone: '021 23 45 67', website: 'pharma.dz', images: ['https://a/b.jpg'], hours: ['Sam–Jeu 8h–20h'] })
    expect(ld['@type']).toBe('Pharmacy')
    expect(ld.geo).toEqual({ '@type': 'GeoCoordinates', latitude: 36.75, longitude: 3.05 })
    expect(ld.telephone).toBe('021234567')
    expect(ld.sameAs).toBe('https://pharma.dz')
    expect(ld.openingHours).toEqual(['Sam–Jeu 8h–20h'])
    expect(ld.inLanguage).toBe('ar-DZ')
  })
  it('omet une adresse vide', () => {
    expect(placeJsonLd({ name: 'X', url, lang: 'en', address: {} })).not.toHaveProperty('address')
  })
})

describe('practitionerJsonLd', () => {
  it('Physician avec spécialité connue seulement', () => {
    const ld = practitionerJsonLd({ name: 'Dr A', url, lang: 'fr', specialties: ['pediatrie', 'hijama'] })
    expect(ld['@type']).toBe('Physician')
    expect(ld.medicalSpecialty).toEqual(['https://schema.org/Pediatric'])
    expect(medicalSpecialties(['hijama'])).toEqual([])
    expect(practitionerJsonLd({ name: 'Dr B', url, lang: 'fr', specialties: ['hijama'] })).not.toHaveProperty('medicalSpecialty')
  })
})

describe('providerJsonLd', () => {
  it('jamais d’AggregateRating sans avis', () => {
    expect(providerJsonLd({ name: 'Karim B.', url, lang: 'fr', rating: null })).not.toHaveProperty('aggregateRating')
    expect(providerJsonLd({ name: 'Karim B.', url, lang: 'fr', rating: { value: 4.5, count: 0 } })).not.toHaveProperty('aggregateRating')
  })
  it('AggregateRating des vrais avis, offres en DZD seulement si prix', () => {
    const ld = providerJsonLd({ name: 'Karim B.', url, lang: 'fr', rating: { value: 4.6, count: 3 }, offers: [{ name: 'Ménage', price: 1500 }, { name: 'Repassage' }], region: 'Oran' })
    expect(ld['@type']).toBe('ProfessionalService')
    expect(ld.aggregateRating).toMatchObject({ ratingValue: 4.6, reviewCount: 3 })
    expect(ld.makesOffer).toEqual([
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Ménage' }, price: 1500, priceCurrency: 'DZD' },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Repassage' } },
    ])
    expect(ld.address).toEqual({ '@type': 'PostalAddress', addressRegion: 'Oran', addressCountry: 'DZ' })
  })
})

describe('classifiedJsonLd', () => {
  it('type selon la catégorie', () => {
    expect(classifiedType('immobilier')).toBe('RealEstateListing')
    expect(classifiedType('vehicules')).toBe('Product')
    expect(classifiedType('objets')).toBe('Product')
    expect(classifiedType('emploi')).toBe('Offer')
    const ld = classifiedJsonLd({ title: 'F3 Kouba', url, lang: 'fr', category: 'immobilier', publishedAt: '2026-11-01T10:00:00Z', images: [null, 'https://a/1.jpg'] })
    expect(ld.datePosted).toBe('2026-11-01T10:00:00Z')
    expect(ld.image).toEqual(['https://a/1.jpg'])
  })
})

describe('procedureJsonLd', () => {
  it('GovernmentService seul sans étapes, HowTo avec étapes', () => {
    expect(procedureJsonLd({ title: 'Passeport', url, lang: 'fr' })).toHaveLength(1)
    const [svc, howTo] = procedureJsonLd({ title: 'Passeport', url, lang: 'fr', steps: ['Prendre rendez-vous', 'Déposer le dossier'], officialUrl: 'https://passeport.interieur.gov.dz' })
    expect(svc['@type']).toBe('GovernmentService')
    expect(svc.sameAs).toBe('https://passeport.interieur.gov.dz')
    expect(howTo['@type']).toBe('HowTo')
    expect(howTo.step).toEqual([
      { '@type': 'HowToStep', position: 1, text: 'Prendre rendez-vous' },
      { '@type': 'HowToStep', position: 2, text: 'Déposer le dossier' },
    ])
  })
})

describe('breadcrumbJsonLd', () => {
  it('positions depuis 1, étapes vides ignorées', () => {
    const ld = breadcrumbJsonLd([
      { name: 'Annuaire', url: 'https://www.mydalil.com/annuaire' },
      { name: '', url: 'https://www.mydalil.com/vide' },
      { name: 'Fiche', url },
    ])
    expect(ld['@type']).toBe('BreadcrumbList')
    expect(ld.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Annuaire', item: 'https://www.mydalil.com/annuaire' },
      { '@type': 'ListItem', position: 2, name: 'Fiche', item: url },
    ])
  })
})

describe('clean et sérialisation', () => {
  it('retire les vides récursivement', () => {
    expect(clean({ a: '', b: null, c: [], d: { '@type': 'X' }, e: 0, f: [{ '@type': 'Y' }] })).toEqual({ e: 0 })
  })
  it('ne peut pas fermer la balise script', () => {
    expect(serializeJsonLd({ name: '</script><script>alert(1)</script>' })).not.toContain('</script>')
  })
})
