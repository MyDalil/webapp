/**
 * Mise en avant payante — règles pures, testées (aucun accès à la base).
 * Règle 4 : une sponsorisation ne touche jamais au statut ni au label de vérification ; elle s’affiche à part,
 * toujours marquée « Sponsorisé », et n’entre jamais dans le classement de confiance.
 */
export type SponsorTarget = 'places' | 'practitioners' | 'providers' | 'classifieds'
export type SponsorKind = 'a-la-une' | 'remontee' | 'partenaire'
export type SponsorStatus = 'demande' | 'active' | 'terminee' | 'refusee'

export type Sponsorship = {
  id: number | string
  targetCollection: SponsorTarget
  targetId: number | string
  kind: SponsorKind
  wilaya?: string | number | null
  startsAt?: string | null
  endsAt?: string | null
  status: SponsorStatus
}

export const SPONSOR_TARGETS: readonly SponsorTarget[] = ['places', 'practitioners', 'providers', 'classifieds']
export const SPONSOR_KINDS: readonly SponsorKind[] = ['a-la-une', 'remontee', 'partenaire']
export const SPONSOR_KIND_LABEL: Record<SponsorKind, string> = { 'a-la-une': 'À la une', remontee: 'Remontée', partenaire: 'Partenaire' }

/** Jamais plus de 2 résultats sponsorisés en tête d’une liste ou d’une recherche. */
export const SPONSORED_MAX = 2

export const SPONSORED_LABEL = { fr: 'Sponsorisé', en: 'Sponsored', ar: 'مُموَّل' } as const
export const sponsoredLabel = (lang: string | null | undefined) => SPONSORED_LABEL[(lang ?? 'fr') as keyof typeof SPONSORED_LABEL] ?? SPONSORED_LABEL.fr

/** Type de l’index de recherche → collection sponsorisable. */
export const SEARCH_TYPE_TARGET: Record<string, SponsorTarget> = { adresse: 'places', praticien: 'practitioners', prestataire: 'providers', annonce: 'classifieds' }

const KIND_ORDER: Record<SponsorKind, number> = { 'a-la-une': 0, partenaire: 1, remontee: 2 }

/** Une sponsorisation est en cours : statut « active », date de début passée, date de fin à venir. */
export function isRunning(s: Sponsorship, now: Date): boolean {
  if (s.status !== 'active' || !s.startsAt || !s.endsAt) return false
  const t = now.getTime()
  return Date.parse(s.startsAt) <= t && t < Date.parse(s.endsAt)
}

/**
 * Sponsorisations à montrer : en cours, de la bonne collection, valables pour la wilaya demandée
 * (une sponsorisation sans wilaya vaut partout ; une sponsorisation de wilaya ne s’affiche que dans cette wilaya).
 * Une fiche n’apparaît qu’une fois ; « À la une », puis « Partenaire », puis « Remontée » ; la locale avant la nationale ; la plus ancienne d’abord.
 */
export function selectSponsored(list: Sponsorship[], opts: { now?: Date; collection?: SponsorTarget; wilaya?: string | number | null; max?: number } = {}): Sponsorship[] {
  const max = Math.max(0, Math.min(SPONSORED_MAX, opts.max ?? SPONSORED_MAX))
  return eligibleSponsorships(list, opts).slice(0, max)
}

/** Toutes les sponsorisations affichables (mêmes règles que `selectSponsored`, sans plafond) : pour retrouver celles présentes dans des résultats. */
export function eligibleSponsorships(list: Sponsorship[], opts: { now?: Date; collection?: SponsorTarget; wilaya?: string | number | null } = {}): Sponsorship[] {
  const now = opts.now ?? new Date()
  const wanted = opts.wilaya == null || opts.wilaya === '' ? null : String(opts.wilaya)
  const seen = new Set<string>()
  return list
    .filter((s) => isRunning(s, now))
    .filter((s) => !opts.collection || s.targetCollection === opts.collection)
    .filter((s) => s.wilaya == null || s.wilaya === '' || (wanted != null && String(s.wilaya) === wanted))
    // À rang égal, la sponsorisation de la wilaya passe avant la nationale.
    .sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || Number(b.wilaya != null && b.wilaya !== '') - Number(a.wilaya != null && a.wilaya !== '') || Date.parse(a.startsAt!) - Date.parse(b.startsAt!))
    .filter((s) => {
      const key = `${s.targetCollection}:${s.targetId}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

export type Sponsored<T> = T & { sponsored: true; sponsorKind: SponsorKind }

/**
 * Sépare les résultats sponsorisés (au plus 2, déjà présents dans les résultats : jamais hors sujet) du reste.
 * Le reste garde son ordre de confiance intact. Les sortants portent `sponsored: true` (site, actions, MCP).
 */
export function liftSponsored<T>(hits: T[], active: Sponsorship[], keyOf: (h: T) => { collection: SponsorTarget; id: string | number } | null, max = SPONSORED_MAX): { sponsored: Sponsored<T>[]; rest: T[] } {
  const by = new Map(active.map((s) => [`${s.targetCollection}:${s.targetId}`, s]))
  const sponsored: Sponsored<T>[] = []
  const rest: T[] = []
  const cap = Math.min(SPONSORED_MAX, max)
  for (const h of hits) {
    const k = keyOf(h)
    const s = k ? by.get(`${k.collection}:${k.id}`) : undefined
    if (s && sponsored.length < cap) {
      sponsored.push({ ...h, sponsored: true, sponsorKind: s.kind })
      by.delete(`${s.targetCollection}:${s.targetId}`)
    } else rest.push(h)
  }
  return { sponsored, rest }
}

/** Dates d’une demande : début demandé (aujourd’hui au plus tôt), durée de 1 à 12 mois. */
export function requestedPeriod(input: { startsAt?: unknown; months?: unknown }, now = new Date()): { startsAt: string; endsAt: string } {
  const asked = typeof input.startsAt === 'string' && !Number.isNaN(Date.parse(input.startsAt)) ? new Date(input.startsAt) : now
  const start = asked.getTime() < now.getTime() ? now : asked
  const months = Math.max(1, Math.min(12, Math.floor(Number(input.months) || 1)))
  const end = new Date(start)
  end.setUTCMonth(end.getUTCMonth() + months)
  return { startsAt: start.toISOString(), endsAt: end.toISOString() }
}

/** Paiements (collection `payments`) : moyens et états. */
export const PAYMENT_PROVIDERS = ['cib', 'edahabia', 'baridimob', 'ccp', 'especes', 'virement', 'stripe', 'chargily', 'slickpay', 'autre'] as const
/** Objet d’un paiement. */
export const PAYMENT_PURPOSES = ['abonnement', 'boost', 'projecteur', 'leads', 'autre'] as const
export const PAYMENT_STATUSES = ['en_attente', 'recu', 'rembourse', 'annule'] as const

/**
 * Passage à « active » : seulement avec un paiement « reçu » lié, ou une note de paiement explicite (activation manuelle).
 * Renvoie un message d’erreur, ou null si le passage est permis. Les autres changements d’état ne sont pas contrôlés ici.
 */
export function activationError(input: { status?: unknown; previousStatus?: unknown; paymentNote?: unknown; hasReceivedPayment: boolean }): string | null {
  if (input.status !== 'active' || input.previousStatus === 'active') return null
  if (input.hasReceivedPayment) return null
  if (typeof input.paymentNote === 'string' && input.paymentNote.trim()) return null
  return 'Activation impossible : liez un paiement « Reçu » à cette mise en avant ou saisissez une note de paiement (moyen, montant, référence).'
}

/** Sponsorisations actives dont la date de fin est passée (à passer en « terminée »). */
export const expiredIds = (list: Pick<Sponsorship, 'id' | 'status' | 'endsAt'>[], now = new Date()) =>
  list.filter((s) => s.status === 'active' && !!s.endsAt && Date.parse(s.endsAt) <= now.getTime()).map((s) => s.id)

/** Pages publiques qui montrent les sponsorisations d’une collection (listes + recherche + accueil). */
export const SPONSOR_PAGES: Record<SponsorTarget, string[]> = {
  places: ['/', '/annuaire', '/recherche'],
  practitioners: ['/', '/praticiens', '/recherche'],
  providers: ['/', '/services', '/recherche'],
  classifieds: ['/', '/annonces', '/recherche'],
}
