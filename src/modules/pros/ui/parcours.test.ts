import { describe, expect, test } from 'vitest'
import {
  billedMonths,
  checkoutProvider,
  claimBlocker,
  freeMonths,
  isVerified,
  normalizePhone,
  partnerBadge,
  PLACE_SECTORS,
  planPrice,
  proofFileError,
  samePhone,
  shortLink,
  subscriptionPlan,
  sumMetrics,
  validateClaim,
  validatePlaceDraft,
} from './parcours'

const sector = PLACE_SECTORS[0]
const okPlace = { name: 'Café du Port', sector: sector.slug, category: sector.categories[0], wilaya: '16', city: 'Alger', phone: '0550 12 34 56' }

describe('inscription d’un établissement', () => {
  test('accepte une fiche complète et ne garde que les champs utiles', () => {
    const r = validatePlaceDraft({ ...okPlace, _status: 'published', verification: 'verified' })
    expect('ok' in r && r.data).toMatchObject({ name: 'Café du Port', wilaya: '16', city: 'Alger' })
    expect(JSON.stringify(r)).not.toContain('published')
    expect(JSON.stringify(r)).not.toContain('verified')
  })
  test('refuse secteur public, catégorie hors secteur, wilaya inconnue, téléphone invalide', () => {
    expect(validatePlaceDraft({ ...okPlace, sector: 'administrations-services-publics' })).toHaveProperty('error')
    expect(validatePlaceDraft({ ...okPlace, category: 'Inconnue' })).toHaveProperty('error')
    expect(validatePlaceDraft({ ...okPlace, wilaya: '70' })).toHaveProperty('error')
    expect(validatePlaceDraft({ ...okPlace, phone: 'abc' })).toHaveProperty('error')
    expect(validatePlaceDraft(null)).toHaveProperty('error')
  })
})

describe('téléphones', () => {
  test('0550…, +213 550… et 00213 550… désignent la même ligne', () => {
    expect(normalizePhone('0550 12 34 56')).toBe('550123456')
    expect(samePhone('+213 550 12 34 56', '0550123456')).toBe(true)
    expect(samePhone('00213550123456', '0550 12 34 56')).toBe(true)
    expect(samePhone('0550123456', '0661123456')).toBe(false)
    expect(samePhone('', '')).toBe(false)
  })
})

describe('revendication', () => {
  test('téléphone exige un numéro ; les autres justificatifs un texte ou un fichier', () => {
    expect(validateClaim({ targetCollection: 'places', slug: 'cafe-alger', proofType: 'telephone', proofText: '0550123456' })).toHaveProperty('ok')
    expect(validateClaim({ targetCollection: 'places', slug: 'cafe-alger', proofType: 'telephone', proofText: '' })).toHaveProperty('error')
    expect(validateClaim({ targetCollection: 'places', slug: 'cafe-alger', proofType: 'registre_commerce', proofText: '' })).toHaveProperty('error')
    expect(validateClaim({ targetCollection: 'places', slug: 'cafe-alger', proofType: 'registre_commerce', proofText: '' }, true)).toHaveProperty('ok')
    expect(validateClaim({ targetCollection: 'classifieds', slug: 'x', proofType: 'autre', proofText: 'x' })).toHaveProperty('error')
    expect(validateClaim({ targetCollection: 'places', slug: '../x', proofType: 'autre', proofText: 'x' })).toHaveProperty('error')
  })
  test('refus si déjà rattachée ou demande en cours', () => {
    expect(claimBlocker({ owner: 4 }, 0)).toMatch(/déjà rattachée/)
    expect(claimBlocker({ owner: null }, 1)).toMatch(/en cours/)
    expect(claimBlocker({}, 0)).toBeNull()
  })
  test('fichier : PDF/JPG/PNG, 5 Mo au plus', () => {
    expect(proofFileError(null)).toBeNull()
    expect(proofFileError({ type: 'application/pdf', size: 1000 })).toBeNull()
    expect(proofFileError({ type: 'image/gif', size: 1000 })).toMatch(/PDF/)
    expect(proofFileError({ type: 'image/png', size: 5 * 1024 * 1024 + 1 })).toMatch(/5 Mo/)
  })
})

describe('prix des formules', () => {
  const pricing = { annualFreeMonths: 2, plans: [{ code: 'pro' as const, monthlyDZD: 3000, monthlyEUR: 20 }, { code: 'premium' as const, monthlyDZD: null, monthlyEUR: 0 }] }
  test('annuel = (12 − mois offerts) × mensuel', () => {
    expect(planPrice(pricing, 'pro', 'mensuel', 'DZD')).toBe(3000)
    expect(planPrice(pricing, 'pro', 'annuel', 'DZD')).toBe(30000)
    expect(planPrice(pricing, 'pro', 'annuel', 'EUR')).toBe(200)
    expect(planPrice({ ...pricing, annualFreeMonths: 0 }, 'pro', 'annuel', 'EUR')).toBe(240)
  })
  test('prix absent ou nul → null (« Tarif sur demande »)', () => {
    expect(planPrice(pricing, 'premium', 'mensuel', 'DZD')).toBeNull()
    expect(planPrice(pricing, 'premium', 'annuel', 'EUR')).toBeNull()
    expect(planPrice(null, 'pro', 'mensuel', 'DZD')).toBeNull()
  })
  test('mois offerts bornés, défaut 2', () => {
    expect(freeMonths(null)).toBe(2)
    expect(freeMonths({ annualFreeMonths: 20 })).toBe(11)
    expect(freeMonths({ annualFreeMonths: -3 })).toBe(0)
    expect(billedMonths('mensuel', 2)).toBe(1)
    expect(billedMonths('annuel', 2)).toBe(10)
  })
  test('code de plan et fournisseur de paiement', () => {
    expect(subscriptionPlan('premium', 'annuel')).toBe('premium_annuel')
    expect(checkoutProvider('DZD')).toBe('chargily')
    expect(checkoutProvider('EUR')).toBe('stripe')
  })
})

describe('page pro publique', () => {
  test('« Partenaire » pour un plan payant, jamais pour le gratuit', () => {
    expect(partnerBadge('gratuit')).toBeNull()
    expect(partnerBadge('pro')).toBe('Partenaire')
    expect(partnerBadge('premium')).toBe('Partenaire')
  })
  test('« Vérifié » seulement si la fiche est réellement vérifiée (jamais par un plan)', () => {
    expect(isVerified('places', { slug: 'a', _status: 'published', verification: 'verified', verifiedAt: '2026-11-01' })).toBe(true)
    expect(isVerified('places', { slug: 'a', _status: 'published', verification: 'unverified', plan: 'premium' })).toBe(false)
    expect(isVerified('places', { slug: 'a', _status: 'draft', verification: 'verified', verifiedAt: '2026-11-01' })).toBe(false)
  })
  test('lien court et statistiques', () => {
    expect(shortLink('cafe-du-port')).toBe('https://www.mydalil.com/@cafe-du-port')
    expect(sumMetrics([{ views: 3, calls: 1 }, { views: 2, whatsapp: 4, directions: null }])).toEqual({ views: 5, calls: 1, whatsapp: 4, directions: 0 })
  })
})
