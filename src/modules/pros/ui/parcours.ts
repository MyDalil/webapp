/**
 * Parcours pro (lot L1) : règles pures, sans base ni réseau, testées seules (parcours.test.ts).
 * Inscription d’une activité, revendication, choix de la formule, libellés publics.
 * Règle 4 : rien ici ne touche la vérification ; « Partenaire » vient d’un plan payant, « Vérifié » seulement de `confiance`.
 */
import { SECTORS, WILAYAS } from '@/platform/referentiel/catalog'
import { kitEligible, type KitDoc } from '../kitRules'
import { billedMonths as coreBilledMonths, freeMonths as coreFreeMonths, subscriptionAmount, type PricingDoc } from '../subscriptionsCore'

/** Les trois entrées du formulaire unique « Inscrire mon activité ». */
export const ACTIVITY_KINDS = ['sante', 'services', 'etablissement'] as const
export type ActivityKind = (typeof ACTIVITY_KINDS)[number]

/** Santé et services à domicile : parcours existants de l’espace pro (sante, services), jamais réécrits. */
export const EXISTING_FLOW: Record<Exclude<ActivityKind, 'etablissement'>, string> = {
  sante: '/espace-pro?espace=praticien',
  services: '/espace-pro?espace=services',
}

/** Secteurs proposés pour une fiche lieu : pas les services publics (fiches officielles, jamais revendiquées). */
export const PLACE_SECTORS = SECTORS.filter((s) => s.slug !== 'administrations-services-publics' && s.slug !== 'sante-soins').map((s) => ({ slug: s.slug, title: s.title, categories: s.categories }))

export const isActivityKind = (v: unknown): v is ActivityKind => typeof v === 'string' && (ACTIVITY_KINDS as readonly string[]).includes(v)

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '')

/** Numéro algérien ou international ramené à ses chiffres significatifs (0550… = +213550… = 213550…). */
export function normalizePhone(v: unknown): string {
  const digits = typeof v === 'string' ? v.replace(/[^\d+]/g, '') : ''
  if (!digits) return ''
  if (digits.startsWith('+213')) return digits.slice(4).replace(/^0/, '')
  if (digits.startsWith('00213')) return digits.slice(5).replace(/^0/, '')
  if (digits.startsWith('213') && digits.length >= 11) return digits.slice(3).replace(/^0/, '')
  return digits.replace(/^\+/, '').replace(/^0/, '')
}

/** Deux numéros désignent la même ligne (au moins 8 chiffres significatifs). */
export const samePhone = (a: unknown, b: unknown) => {
  const x = normalizePhone(a)
  return x.length >= 8 && x === normalizePhone(b)
}

const PHONE_RE = /^\+?[\d\s.()-]{8,20}$/

export type PlaceDraft = { name: string; sector: string; category: string; wilaya: string; city: string; address: string; phone: string; intro: string }

/** Fiche lieu proposée par un pro : seulement les champs utiles ; toujours créée en brouillon. */
export function validatePlaceDraft(body: Record<string, unknown> | null): { ok: true; data: PlaceDraft } | { error: string } {
  if (!body) return { error: 'Demande illisible.' }
  const name = str(body.name, 120)
  if (name.length < 2) return { error: 'Nom de l’établissement à préciser.' }
  const sector = PLACE_SECTORS.find((s) => s.slug === body.sector)
  if (!sector) return { error: 'Secteur à choisir.' }
  const category = str(body.category, 80)
  if (!sector.categories.includes(category)) return { error: 'Catégorie à choisir.' }
  const wilaya = str(String(body.wilaya ?? ''), 3)
  if (!WILAYAS.some((w) => String(w.code) === wilaya)) return { error: 'Wilaya à choisir.' }
  const city = str(body.city, 80)
  if (city.length < 2) return { error: 'Ville à préciser.' }
  const phone = str(body.phone, 20)
  if (phone && !PHONE_RE.test(phone)) return { error: 'Numéro de téléphone invalide.' }
  return { ok: true, data: { name, sector: sector.slug, category, wilaya, city, address: str(body.address, 200), phone, intro: str(body.intro, 600) } }
}

/** Revendication : fiches revendicables et justificatifs acceptés (contrat `claims`). */
export const CLAIM_TARGETS = ['places', 'practitioners', 'providers'] as const
export type ClaimTarget = (typeof CLAIM_TARGETS)[number]
export const PROOF_TYPES = ['telephone', 'registre_commerce', 'carte_pro', 'autre'] as const
export type ProofType = (typeof PROOF_TYPES)[number]
export const PROOF_LABEL: Record<ProofType, string> = { telephone: 'Téléphone professionnel', registre_commerce: 'Registre de commerce', carte_pro: 'Carte professionnelle', autre: 'Autre justificatif' }

/** Page publique d’une fiche revendicable (pour revenir à la fiche). */
export const TARGET_PATH: Record<ClaimTarget, string> = { places: '/adresses', practitioners: '/praticiens', providers: '/prestataires' }

export const isClaimTarget = (v: unknown): v is ClaimTarget => typeof v === 'string' && (CLAIM_TARGETS as readonly string[]).includes(v)

/** Justificatif joint : PDF, JPG ou PNG, 5 Mo au plus (collection privée `claim-documents`). */
export const PROOF_MAX_BYTES = 5 * 1024 * 1024
export const PROOF_MIME = ['application/pdf', 'image/jpeg', 'image/png'] as const
export function proofFileError(file: { type: string; size: number } | null): string | null {
  if (!file || !file.size) return null
  if (!(PROOF_MIME as readonly string[]).includes(file.type)) return 'Justificatif : PDF, JPG ou PNG seulement.'
  if (file.size > PROOF_MAX_BYTES) return 'Justificatif : 5 Mo au plus.'
  return null
}

export type ClaimInput = { targetCollection: ClaimTarget; slug: string; proofType: ProofType; proofText: string }

export function validateClaim(body: Record<string, unknown> | null, hasFile = false): { ok: true; data: ClaimInput } | { error: string } {
  if (!body) return { error: 'Demande illisible.' }
  if (!isClaimTarget(body.targetCollection)) return { error: 'Type de fiche inconnu.' }
  const slug = str(body.slug, 160)
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) return { error: 'Fiche à préciser.' }
  const proofType = body.proofType
  if (typeof proofType !== 'string' || !(PROOF_TYPES as readonly string[]).includes(proofType)) return { error: 'Type de justificatif à choisir.' }
  const proofText = str(body.proofText, 300)
  if (proofType === 'telephone' && !PHONE_RE.test(proofText)) return { error: 'Indiquez le numéro professionnel affiché sur la fiche.' }
  if (proofType !== 'telephone' && !proofText && !hasFile) return { error: 'Indiquez le numéro du justificatif ou joignez-le.' }
  return { ok: true, data: { targetCollection: body.targetCollection, slug, proofType: proofType as ProofType, proofText } }
}

/** Refus d’une revendication : fiche déjà rattachée, ou demande déjà en cours. */
export function claimBlocker(target: { owner?: unknown }, pending: number): string | null {
  if (target.owner != null && target.owner !== '') return 'Cette fiche est déjà rattachée à un compte professionnel.'
  if (pending > 0) return 'Une demande de revendication est déjà en cours pour cette fiche.'
  return null
}

/* ——— Formules ——— */

export type Currency = 'DZD' | 'EUR'
export type Period = 'mensuel' | 'annuel'
export type PlanCode = 'pro' | 'premium'
export type SubscriptionPlan = 'pro_mensuel' | 'pro_annuel' | 'premium_mensuel' | 'premium_annuel'
export type PricingPlan = { code: PlanCode; label?: string | null; monthlyDZD?: number | null; monthlyEUR?: number | null; features?: { text?: string | null }[] | string[] | null }
export type Pricing = { annualFreeMonths?: number | null; plans?: PricingPlan[] | null }

export const PERIODS: Period[] = ['mensuel', 'annuel']
export const isPeriod = (v: unknown): v is Period => v === 'mensuel' || v === 'annuel'
export const isCurrency = (v: unknown): v is Currency => v === 'DZD' || v === 'EUR'
export const isPlanCode = (v: unknown): v is PlanCode => v === 'pro' || v === 'premium'

/** Mois offerts sur l’annuel, bornés à 0–11 (réglage `annualFreeMonths`, défaut 2) — règle unique de subscriptionsCore. */
export const freeMonths = (p: Pricing | null | undefined) => coreFreeMonths(p?.annualFreeMonths)

/** Mois payés : 1 au mois, 12 − mois offerts à l’année. */
export const billedMonths = (period: Period, free: number) => coreBilledMonths(`pro_${period}`, free)

/** Prix d’une formule (annuel = 12 − mois offerts, pour 12 mois) ; null = « Tarif sur demande » (aucun prix inventé). */
export function planPrice(pricing: Pricing | null | undefined, code: PlanCode, period: Period, currency: Currency): number | null {
  return subscriptionAmount(pricing as PricingDoc | null | undefined, `${code}_${period}`, currency)
}

export const subscriptionPlan = (code: PlanCode, period: Period): SubscriptionPlan => `${code}_${period}`

/**
 * Abonnement « en attente » déjà présent pour la fiche : réutilisé s’il appartient au même membre et n’a aucun paiement reçu ;
 * sinon conflit. Aucun : nouvel abonnement.
 */
export function reusableSubscription(pending: { member?: unknown } | null | undefined, memberId: number, paidPayments: number): 'nouveau' | 'reutiliser' | 'conflit' {
  if (!pending) return 'nouveau'
  const owner = pending.member && typeof pending.member === 'object' ? (pending.member as { id?: unknown }).id : pending.member
  return String(owner) === String(memberId) && paidPayments === 0 ? 'reutiliser' : 'conflit'
}

/** Paiement en ligne : Chargily pour le dinar, Stripe pour l’euro. */
export const checkoutProvider = (currency: Currency) => (currency === 'DZD' ? 'chargily' : 'stripe') as 'chargily' | 'stripe'

/** Paiement hors ligne avec reçu (vérifié à la main par l’équipe). */
export const RECEIPT_METHODS = ['baridimob', 'ccp', 'virement'] as const
export type ReceiptMethod = (typeof RECEIPT_METHODS)[number]
export const RECEIPT_LABEL: Record<ReceiptMethod, string> = { baridimob: 'BaridiMob', ccp: 'CCP', virement: 'Virement' }
export const isReceiptMethod = (v: unknown): v is ReceiptMethod => typeof v === 'string' && (RECEIPT_METHODS as readonly string[]).includes(v)

export const formatPrice = (value: number, currency: Currency, lang: 'fr' | 'en' | 'ar' = 'fr') =>
  new Intl.NumberFormat(lang === 'ar' ? 'ar-DZ' : lang === 'en' ? 'en-GB' : 'fr-FR', { style: 'currency', currency, maximumFractionDigits: currency === 'DZD' ? 0 : 2 }).format(value)

/* ——— Page pro publique ——— */

/** « Partenaire » pour un plan payant ; jamais « Vérifié » (règle 4). */
export const partnerBadge = (plan: 'gratuit' | 'pro' | 'premium') => (plan === 'gratuit' ? null : 'Partenaire')

/** « Vérifié » : même règle que le kit (lecture seule des champs de confiance). */
export const isVerified = (collection: string, doc: KitDoc | null | undefined) => kitEligible(collection, doc)

/** Lien court d’une page pro : mydalil.com/@slug. */
export const shortLink = (slug: string, origin = 'https://www.mydalil.com') => `${origin}/@${slug}`

/** Somme des compteurs quotidiens sur la période (metrics-daily). */
type Counts = { views: number; calls: number; whatsapp: number; directions: number }
export function sumMetrics(rows: { views?: number | null; calls?: number | null; whatsapp?: number | null; directions?: number | null }[]): Counts {
  return rows.reduce<Counts>((t, r) => ({ views: t.views + (r.views ?? 0), calls: t.calls + (r.calls ?? 0), whatsapp: t.whatsapp + (r.whatsapp ?? 0), directions: t.directions + (r.directions ?? 0) }), { views: 0, calls: 0, whatsapp: 0, directions: 0 })
}
