import { describe, expect, it } from 'vitest'
import { ACTION_LABELS, contactActions, shareMessage, waNumber, whatsappShareUrl } from './share'
import { placeClaimLabel, PRACTITIONER_CLAIM, PRO_CLAIM } from './claim'
import { factualDescription } from './metadata'

describe('partage', () => {
  it('message pré-rempli', () => {
    expect(shareMessage('Pharmacie Centrale', 'https://www.mydalil.com/adresses/p')).toBe('Voici Pharmacie Centrale sur DALIL : https://www.mydalil.com/adresses/p')
  })
  it('lien WhatsApp encodé', () => {
    expect(whatsappShareUrl('A & B', 'https://x.dz/a?b=1')).toBe(`https://wa.me/?text=${encodeURIComponent('Voici A & B sur DALIL : https://x.dz/a?b=1')}`)
  })
})

describe('partage en anglais et en arabe', () => {
  it('message traduit, nom jamais traduit', () => {
    expect(shareMessage('Pharmacie Centrale', 'https://www.mydalil.com/en/adresses/p', 'en')).toBe('Here is Pharmacie Centrale on DALIL: https://www.mydalil.com/en/adresses/p')
    expect(shareMessage('Pharmacie Centrale', 'https://www.mydalil.com/ar/adresses/p', 'ar')).toBe('إليك Pharmacie Centrale على دليل: https://www.mydalil.com/ar/adresses/p')
    expect(whatsappShareUrl('A', 'https://x.dz', 'ar')).toBe(`https://wa.me/?text=${encodeURIComponent('إليك A على دليل: https://x.dz')}`)
  })
  it('libellés des boutons', () => {
    const all = { phone: '0555123456', whatsapp: '0555123456', directions: 'https://maps.example/d' }
    expect(contactActions(all, 'en').map((a) => a.label)).toEqual(['Call', 'WhatsApp', 'Directions'])
    expect(contactActions(all, 'ar').map((a) => a.label)).toEqual(['اتصال', 'واتساب', 'الاتجاهات'])
    expect(ACTION_LABELS.share).toEqual({ fr: 'Partager', en: 'Share', ar: 'مشاركة' })
  })
})

describe('numéro WhatsApp', () => {
  it('format international algérien', () => {
    expect(waNumber('0555 12 34 56')).toBe('213555123456')
    expect(waNumber('+213 555 12 34 56')).toBe('213555123456')
    expect(waNumber('00213555123456')).toBe('213555123456')
    expect(waNumber('12')).toBeNull()
    expect(waNumber(null)).toBeNull()
  })
})

describe('boutons selon les champs disponibles', () => {
  it('aucun champ : aucun bouton', () => {
    expect(contactActions({})).toEqual([])
  })
  it('téléphone seul : Appeler', () => {
    expect(contactActions({ phone: '021 23 45 67' })).toEqual([{ kind: 'call', label: 'Appeler', href: 'tel:021234567', external: false }])
  })
  it('WhatsApp seulement si un numéro WhatsApp est renseigné', () => {
    expect(contactActions({ phone: '0555123456' }).map((a) => a.kind)).toEqual(['call'])
    expect(contactActions({ phone: '0555123456', whatsapp: '0555123456' }).map((a) => a.kind)).toEqual(['call', 'whatsapp'])
  })
  it('Itinéraire seulement avec coordonnées', () => {
    expect(contactActions({ directions: 'https://www.google.com/maps/dir/?api=1&destination=36.7,3.0' }).map((a) => a.kind)).toEqual(['directions'])
  })
})

describe('revendication', () => {
  it('médecins et dentistes : texte validé', () => {
    expect(placeClaimLabel('sante-soins', 'Médecins')).toBe(PRACTITIONER_CLAIM)
  })
  it('commerce : revendication gratuite', () => {
    expect(placeClaimLabel('restaurants-gastronomie', 'Cafés')).toBe(PRO_CLAIM)
  })
  it('lieux publics : jamais', () => {
    expect(placeClaimLabel('administrations-services-publics', 'Ambassades')).toBeNull()
    expect(placeClaimLabel('mosquees-priere', 'Mosquées')).toBeNull()
    expect(placeClaimLabel('culture-nature-loisirs', 'Plages')).toBeNull()
  })
})

describe('description factuelle', () => {
  it('assemble les parties présentes et coupe à 160 caractères', () => {
    expect(factualDescription(['Café à Alger.', null, ''])).toBe('Café à Alger.')
    const long = factualDescription(['mot '.repeat(80)])
    expect(long.length).toBeLessThanOrEqual(160)
    expect(long.endsWith('…')).toBe(true)
  })
})
