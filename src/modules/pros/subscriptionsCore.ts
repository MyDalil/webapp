/**
 * Abonnements des professionnels — règles pures, testées (aucun accès à la base).
 * Règle 4 : un abonnement donne une formule (« Partenaire »), jamais un statut ni un label de vérification.
 */
export const SUBSCRIPTION_TARGETS = ['places', 'practitioners', 'providers'] as const
export type SubscriptionTarget = (typeof SUBSCRIPTION_TARGETS)[number]
export const SUBSCRIPTION_PLANS = ['pro_mensuel', 'pro_annuel', 'premium_mensuel', 'premium_annuel'] as const
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number]
export const SUBSCRIPTION_STATUSES = ['en_attente', 'active', 'expiree', 'annulee'] as const
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number]
export type PlanLevel = 'gratuit' | 'pro' | 'premium'

export const PLAN_LABEL: Record<SubscriptionPlan, string> = { pro_mensuel: 'Pro — mensuel', pro_annuel: 'Pro — annuel', premium_mensuel: 'Premium — mensuel', premium_annuel: 'Premium — annuel' }
export const TARGET_LABEL: Record<SubscriptionTarget, string> = { places: 'Adresse', practitioners: 'Praticien', providers: 'Prestataire' }
/** Page publique d’une fiche (sans préfixe de langue). */
export const TARGET_PATH: Record<SubscriptionTarget, (slug: string) => string> = {
  places: (s) => `/adresses/${s}`,
  practitioners: (s) => `/praticiens/${s}`,
  providers: (s) => `/prestataires/${s}`,
}
/** Mois offerts par défaut sur un abonnement annuel (réglage `pricing.annualFreeMonths`). */
export const DEFAULT_ANNUAL_FREE_MONTHS = 2
/** Rappel envoyé une seule fois, 7 jours avant la fin. */
export const REMINDER_DAYS = 7
const DAY = 86_400_000

export const isTarget = (v: unknown): v is SubscriptionTarget => (SUBSCRIPTION_TARGETS as readonly string[]).includes(String(v))
export const isPlan = (v: unknown): v is SubscriptionPlan => (SUBSCRIPTION_PLANS as readonly string[]).includes(String(v))
export const levelOf = (plan: unknown): PlanLevel => (String(plan).startsWith('premium_') ? 'premium' : String(plan).startsWith('pro_') ? 'pro' : 'gratuit')
export const isAnnual = (plan: unknown) => String(plan).endsWith('_annuel')

/** Mois offerts : absent ou illisible → défaut (2) ; sinon entier borné à 0–11 (on paie toujours au moins un mois). */
export function freeMonths(v: unknown): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : Number.NaN
  return Number.isFinite(n) ? Math.min(11, Math.max(0, Math.floor(n))) : DEFAULT_ANNUAL_FREE_MONTHS
}

/**
 * Règle unique de l’annuel (Rad) : « l’annuel offre N mois » = on paie 12 − N mois pour 12 mois d’abonnement.
 * Durée en mois : mensuel 1, annuel 12 (les mois offerts baissent le prix, jamais la durée).
 */
export const planMonths = (plan: SubscriptionPlan) => (isAnnual(plan) ? 12 : 1)
/** Mois facturés : mensuel 1 ; annuel 12 − mois offerts. */
export const billedMonths = (plan: SubscriptionPlan, annualFreeMonths: unknown) => (isAnnual(plan) ? 12 - freeMonths(annualFreeMonths) : 1)

function addMonths(d: Date, months: number): Date {
  const out = new Date(d.getTime())
  const day = out.getUTCDate()
  out.setUTCDate(1)
  out.setUTCMonth(out.getUTCMonth() + months)
  const last = new Date(Date.UTC(out.getUTCFullYear(), out.getUTCMonth() + 1, 0)).getUTCDate()
  out.setUTCDate(Math.min(day, last))
  return out
}

/** Période d’un abonnement : début (au plus tôt maintenant, ou à la fin de l’abonnement en cours), fin selon le plan. */
export function subscriptionPeriod(plan: SubscriptionPlan, now = new Date(), runningUntil?: string | null): { startsAt: string; endsAt: string } {
  const after = runningUntil && Date.parse(runningUntil) > now.getTime() ? new Date(runningUntil) : now
  return { startsAt: after.toISOString(), endsAt: addMonths(after, planMonths(plan)).toISOString() }
}

export type SubRow = { id: number | string; member?: unknown; targetCollection?: string | null; targetId?: string | number | null; plan?: string | null; status?: string | null; startsAt?: string | null; endsAt?: string | null; remindedAt?: string | null }

/** En cours : « active », commencé, fin à venir (fin absente = en cours). */
export function isRunningSub(s: SubRow, now = new Date()): boolean {
  if (s.status !== 'active') return false
  const t = now.getTime()
  if (s.startsAt && Date.parse(s.startsAt) > t) return false
  return !s.endsAt || Date.parse(s.endsAt) > t
}

/** Formule d’une fiche : la plus haute des formules en cours, sinon « gratuit ». */
export function planFrom(list: SubRow[], targetCollection: string, targetId: string | number, now = new Date()): PlanLevel {
  let best: PlanLevel = 'gratuit'
  for (const s of list) {
    if (s.targetCollection !== targetCollection || String(s.targetId) !== String(targetId) || !isRunningSub(s, now)) continue
    const l = levelOf(s.plan)
    if (l === 'premium') return 'premium'
    if (l === 'pro') best = 'pro'
  }
  return best
}

/** Abonnements actifs arrivés à leur fin. */
export const expiredSubIds = (list: SubRow[], now = new Date()) => list.filter((s) => s.status === 'active' && !!s.endsAt && Date.parse(s.endsAt) <= now.getTime()).map((s) => s.id)

/** Abonnements actifs qui finissent dans 7 jours au plus et dont le rappel n’est pas encore parti. */
export const dueReminders = (list: SubRow[], now = new Date()) =>
  list.filter((s) => s.status === 'active' && !s.remindedAt && !!s.endsAt && Date.parse(s.endsAt) > now.getTime() && Date.parse(s.endsAt) - now.getTime() <= REMINDER_DAYS * DAY)

export type PricingPlan = { code?: string | null; label?: string | null; monthlyDZD?: number | null; monthlyEUR?: number | null; features?: string[] | null }
export type PricingDoc = { annualFreeMonths?: number | null; plans?: PricingPlan[] | null } & Record<string, unknown>

/**
 * Montant d’un abonnement (unité de la devise, pas de centimes) : mensuel = prix mensuel ; annuel = (12 − mois offerts)
 * × prix mensuel, pour 12 mois. `null` = prix non saisi → afficher « Tarif sur demande », jamais un prix inventé.
 */
export function subscriptionAmount(pricing: PricingDoc | null | undefined, plan: SubscriptionPlan, currency: 'DZD' | 'EUR'): number | null {
  const code = levelOf(plan)
  const row = (pricing?.plans ?? []).find((p) => p?.code === code)
  const monthly = currency === 'DZD' ? row?.monthlyDZD : row?.monthlyEUR
  if (typeof monthly !== 'number' || !Number.isFinite(monthly) || monthly <= 0) return null
  return Math.round(monthly * billedMonths(plan, pricing?.annualFreeMonths) * 100) / 100
}
