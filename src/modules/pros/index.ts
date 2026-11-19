/** Professionnels — porte serveur : mise en avant payante (séparée de la vérification) et kit « Vérifié sur DALIL ». */
export { SPONSORED_LABEL, SPONSORED_MAX, SPONSOR_KIND_LABEL, liftSponsored, selectSponsored, sponsoredLabel, type Sponsored, type SponsorKind, type SponsorTarget, type Sponsorship } from './sponsoringCore'
export { activeSponsorships, forgetSponsorships, sponsoredFor, sponsoredItems, type SponsoredItem } from './sponsoring'
export { requestSponsorship } from './request'
export { expireSponsorships } from './expire'
export { COUNTRIES, type Country } from './country'
export { kitTarget, myKits } from './kit'
export { qrSvg } from './qr'
export { activateSubscription, expireSubscriptions, planOf } from './subscriptions'
export { getPricing } from './pricing'
export { decideClaim, saveClaimDocument } from './claims'
export { SUBSCRIPTIONS_TAG, refreshSubscriptionTarget } from './subscriptionsCollection'
export { PRICING_TAG } from './pricingGlobal'
export { PLAN_LABEL, SUBSCRIPTION_PLANS, SUBSCRIPTION_TARGETS, levelOf, planMonths, subscriptionAmount, subscriptionPeriod, type PlanLevel, type PricingDoc, type SubscriptionPlan, type SubscriptionTarget } from './subscriptionsCore'
export { CLAIM_DOC_MAX_BYTES, CLAIM_DOC_TYPES, CLAIM_PROOFS, claimDocumentError, type ClaimDecision, type ClaimProof } from './claimsCore'
export { Subscriptions, Claims, ClaimDocuments, Leads, Pricing } from './collections'

import { actions } from './actions'
import { subscriptionActions } from './subscriptionsActions'
/** Actions du module (registre) : mises en avant, abonnements, revendications, paiements. */
export const prosActions = [...actions, ...subscriptionActions]
// Lot M (3ᵉ tour) : demandes des visiteurs, classement « Partenaire », assistant Premium.
export { PARTNER_LABEL, partnerLabel, leadKindFor, isPublicCategory, validateLead, type LeadKind, type LeadTarget, type Plan } from './offreRules'
export { ficheOffer, paidPlans } from './offre'
export { submitLead } from './demande'
export { askFiche, cleanQuestion, ASSISTANT_DAILY_PER_VISITOR, ASSISTANT_MAX_CHARS } from './assistant'
// Lot L1 — parcours pro (inscription, revendication, finalisation, abonnement, espace pro, page /pro/[slug]).
export { readPricing, claimTarget, createClaim, createPlaceDraft, finalizeDraft, finalizeTarget, myTargets, proDashboard, proPage, requestSubscription, type ProDashboard, type ProPage } from './ui/serveur'
export { createCheckout, submitPaymentReceipt, chargilyWebhook, stripeWebhook } from './payments/server'
export { paymentActions } from './payments/actions'
export { MANUAL_PROVIDERS, PAYMENT_PURPOSES, type PaymentPurpose, type OnlineProvider } from './payments/core'
export type { CheckoutInput, CheckoutResult } from './payments/checkout'
export { paymentReturnHtml } from './payments/returnPage'
