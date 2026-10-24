import { describe, expect, it } from 'vitest'
import { canRenew, maskContacts, priceLabel } from './referentiel'
import { parseClassified } from './validate'

const ok = () => true
const base = { title: 'Appartement F3 lumineux', category: 'immobilier', subcategory: 'appartement', description: 'Bel appartement au 3e étage, proche du tramway et des écoles.', price: '45 000', priceMode: 'fixed', wilaya: '16', deal: 'location', rooms: '3' }

describe('parseClassified', () => {
  it('accepte une annonce immobilière complète', () => {
    const r = parseClassified(base, ok)
    expect('error' in r).toBe(false)
    if ('error' in r) return
    expect(r.subcategory).toBe('immobilier:appartement')
    expect(r.price).toBe(45000)
    expect(r.rooms).toBe(3)
  })
  it('refuse un type qui n’appartient pas à la catégorie', () => {
    expect(parseClassified({ ...base, subcategory: 'voiture' }, ok)).toEqual({ error: 'Choisissez le type d’annonce.' })
  })
  it('exige la transaction pour l’immobilier', () => {
    expect('error' in parseClassified({ ...base, deal: '' }, ok)).toBe(true)
  })
  it('exige un prix, sauf sur demande ou gratuit', () => {
    expect('error' in parseClassified({ ...base, price: '' }, ok)).toBe(true)
    const free = parseClassified({ ...base, price: '', priceMode: 'free' }, ok)
    expect('error' in free ? null : free.price).toBe(0)
  })
  it('accepte une offre d’emploi sans salaire', () => {
    const r = parseClassified({ title: 'Vendeur en boutique', category: 'emploi', subcategory: 'offre', description: 'Boutique de vêtements cherche vendeur, expérience souhaitée.', wilaya: '31', contract: 'cdi' }, ok)
    expect('error' in r).toBe(false)
  })
  it('ignore les caractéristiques d’une autre catégorie', () => {
    const r = parseClassified({ ...base, brand: 'Renault' }, ok)
    expect('error' in r ? 'x' : r.brand).toBe(null)
  })
  it('refuse une commune hors wilaya', () => {
    expect(parseClassified({ ...base, commune: '31-oran' }, () => false)).toEqual({ error: 'La commune ne fait pas partie de cette wilaya.' })
  })
})

describe('règles', () => {
  it('masque numéros et emails', () => {
    expect(maskContacts('Appelez le 0555 12 34 56 ou ecrire@mail.dz')).toBe('Appelez le [coordonnées masquées] ou [coordonnées masquées]')
  })
  it('affiche le loyer par mois', () => {
    expect(priceLabel({ category: 'immobilier', price: 45000, priceMode: 'negotiable', deal: 'location' }).replace(/\s/g, ' ')).toBe('45 000 DA / mois · négociable')
  })
  it('renouvelle dans les 7 derniers jours ou après expiration', () => {
    const now = new Date('2026-10-21T10:00:00Z')
    expect(canRenew('expired', null, now)).toBe(true)
    expect(canRenew('published', '2026-10-25T10:00:00Z', now)).toBe(true)
    expect(canRenew('published', '2026-11-30T10:00:00Z', now)).toBe(false)
  })
})
