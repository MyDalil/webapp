import { describe, expect, it } from 'vitest'
import { PARTNER_LABEL, ficheOfferOf, leadKindFor, planFromSubscriptions, validateLead } from './offreRules'

describe('demandes des visiteurs', () => {
  it('choisit le type de demande selon la fiche', () => {
    expect(leadKindFor('providers', null)).toBe('devis')
    expect(leadKindFor('places', 'Artisans')).toBe('devis')
    expect(leadKindFor('places', 'Agences immobilières')).toBe('devis')
    expect(leadKindFor('places', 'Écoles primaires')).toBe('preinscription')
    expect(leadKindFor('places', 'Restaurants')).toBe('rappel')
    expect(leadKindFor('practitioners', null)).toBe('rappel')
  })
  it('jamais sur un lieu public ou officiel', () => {
    for (const c of ['Hôpitaux', 'Pharmacies', 'Mosquées', 'Ministères', 'Consulats', 'Universités']) expect(leadKindFor('places', c)).toBeNull()
    expect(ficheOfferOf({ collection: 'places', category: 'Hôpitaux', hasOwner: true, plan: 'premium' })).toMatchObject({ lead: null, assistant: false })
  })
  it('ouvert seulement avec un propriétaire ou un plan payant ; assistant en Premium seulement', () => {
    expect(ficheOfferOf({ collection: 'places', category: 'Restaurants', hasOwner: false, plan: 'gratuit' }).lead).toBeNull()
    expect(ficheOfferOf({ collection: 'places', category: 'Restaurants', hasOwner: true, plan: 'gratuit' })).toMatchObject({ lead: 'rappel', assistant: false })
    expect(ficheOfferOf({ collection: 'places', category: 'Restaurants', hasOwner: false, plan: 'pro' })).toMatchObject({ lead: 'rappel', assistant: false })
    expect(ficheOfferOf({ collection: 'providers', hasOwner: false, plan: 'premium' })).toMatchObject({ lead: 'devis', assistant: true })
    expect(ficheOfferOf({ collection: 'providers', hasOwner: true, plan: 'premium', demo: true })).toMatchObject({ lead: null, assistant: false })
  })
  it('valide le formulaire', () => {
    const ok = validateLead({ collection: 'places', id: '12', name: 'Amina', phone: '+213 555 12 34 56', message: 'Bonjour, un devis svp', consent: true })
    expect(ok.ok).toBe(true)
    expect(validateLead({ collection: 'places', id: '12', name: 'Amina', phone: '+213 555 12 34 56', message: 'Bonjour', consent: false }).ok).toBe(false)
    expect(validateLead({ collection: 'places', id: '12', name: 'Amina', phone: 'abc', message: 'Bonjour', consent: true }).ok).toBe(false)
    expect(validateLead({ collection: 'members', id: '12', name: 'Amina', phone: '0555123456', message: 'Bonjour', consent: true }).ok).toBe(false)
    expect(validateLead({ collection: 'places', id: '12', name: 'Amina', phone: '0555123456', email: 'x@', message: 'Bonjour', consent: true }).ok).toBe(false)
  })
})

describe('plan et libellé', () => {
  const now = new Date('2026-11-19T12:00:00Z')
  it('plan en cours seulement', () => {
    expect(planFromSubscriptions([{ plan: 'pro_mensuel', status: 'active', endsAt: '2026-12-01' }], now)).toBe('pro')
    expect(planFromSubscriptions([{ plan: 'premium_annuel', status: 'active', endsAt: '2027-01-01' }, { plan: 'pro_mensuel', status: 'active', endsAt: '2026-12-01' }], now)).toBe('premium')
    expect(planFromSubscriptions([{ plan: 'premium_annuel', status: 'expiree', endsAt: '2027-01-01' }], now)).toBe('gratuit')
    expect(planFromSubscriptions([{ plan: 'pro_mensuel', status: 'active', endsAt: '2026-11-01' }], now)).toBe('gratuit')
  })
  it('libellé « Partenaire », jamais « Vérifié » (règle 4)', () => {
    expect(PARTNER_LABEL).toEqual({ fr: 'Partenaire', en: 'Partner', ar: 'شريك' })
    expect(Object.values(PARTNER_LABEL).join(' ')).not.toMatch(/vérifi|verified|موثق/i)
  })
})
