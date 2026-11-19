/**
 * Offre des professionnels sur les fiches — règles pures, testées (aucun accès à la base).
 * Règle 4 : le libellé payant est « Partenaire », jamais « Vérifié » ; il ne touche à aucun statut du module confiance.
 * Lieux publics et officiels : jamais de demande ni d’assistant, ils restent complets et gratuits.
 */
export type Plan = 'gratuit' | 'pro' | 'premium'
export type LeadTarget = 'places' | 'practitioners' | 'providers'
export type LeadKind = 'devis' | 'preinscription' | 'rappel'

export const LEAD_TARGETS: readonly LeadTarget[] = ['places', 'practitioners', 'providers']
export const PARTNER_LABEL = { fr: 'Partenaire', en: 'Partner', ar: 'شريك' } as const
export const partnerLabel = (lang: string | null | undefined) => PARTNER_LABEL[(lang ?? 'fr') as keyof typeof PARTNER_LABEL] ?? PARTNER_LABEL.fr

/** Lieux publics ou officiels (catégories du référentiel) : jamais de demande, jamais d’assistant payant. */
const PUBLIC_CATEGORIES = new Set([
  // Administrations et services publics
  'Wilayas et daïras', 'Services municipaux', 'Tribunaux', 'Sécurité sociale', 'Impôts et douanes', 'Ministères', 'Ambassades', 'Consulats', 'Bureaux de poste', 'Offices du tourisme', 'Contacts utiles et urgences', 'Administrations',
  // Santé publique et officines
  'Hôpitaux', 'Pharmacies',
  // Lieux de culte
  'Mosquées', 'Salles de prière',
  // Patrimoine, nature, lieux ouverts à tous
  'Musées', 'Monuments et sites historiques', 'Sites archéologiques', 'Parcs naturels et réserves', 'Cascades, gorges et grottes', 'Lacs et oasis', 'Bibliothèques', 'Parcs', 'Plages', 'Jardins',
  // Enseignement supérieur et transports publics
  'Universités', 'Gares et stations',
])

/** Écoles privées possibles (référentiel) : « Pré-inscrire mon enfant ». */
const SCHOOL_CATEGORIES = new Set(['Crèches', 'Écoles primaires', 'Collèges', 'Lycées', 'Écoles', 'Écoles coraniques'])

/** Artisans, agences et métiers sur devis : « Demander un devis ». */
const QUOTE_CATEGORIES = new Set([
  'Architectes', 'Artisans', 'Construction', 'Rénovation', 'Entretien', 'Déménagement', 'Transporteurs', 'Traiteurs',
  'Agences immobilières', 'Programmes immobiliers', 'Gestion locative', 'Agences de voyages', 'Omra', 'Hajj', 'Agences Omra & Hajj', 'Conseil aux entreprises',
])

export const isPublicCategory = (category: string | null | undefined) => Boolean(category && PUBLIC_CATEGORIES.has(category))

/** Type de demande proposé par une fiche privée (null : lieu public ou officiel). */
export function leadKindFor(collection: LeadTarget, category: string | null | undefined): LeadKind | null {
  if (collection === 'providers') return 'devis'
  if (collection === 'practitioners') return 'rappel'
  if (isPublicCategory(category)) return null
  if (category && SCHOOL_CATEGORIES.has(category)) return 'preinscription'
  if (category && QUOTE_CATEGORIES.has(category)) return 'devis'
  return 'rappel'
}

/**
 * Ce que la fiche propose : un formulaire de demande si elle a un propriétaire ou un plan payant,
 * l’assistant seulement en Premium ; rien pour une fiche de démonstration ou un lieu public.
 */
export function ficheOfferOf(input: { collection: LeadTarget; category?: string | null; hasOwner: boolean; plan: Plan; demo?: boolean | null }): { lead: LeadKind | null; assistant: boolean; plan: Plan } {
  const kind = input.demo ? null : leadKindFor(input.collection, input.category)
  if (!kind) return { lead: null, assistant: false, plan: input.plan }
  const open = input.hasOwner || input.plan !== 'gratuit'
  return { lead: open ? kind : null, assistant: input.plan === 'premium', plan: input.plan }
}

/** Abonnement en cours (statut actif, fin à venir) → plan. */
export function planFromSubscriptions(list: { plan?: string | null; status?: string | null; endsAt?: string | null }[], now = new Date()): Plan {
  let best: Plan = 'gratuit'
  for (const s of list) {
    if (s.status !== 'active' || (s.endsAt && Date.parse(s.endsAt) <= now.getTime())) continue
    if (s.plan?.startsWith('premium')) return 'premium'
    if (s.plan?.startsWith('pro')) best = 'pro'
  }
  return best
}

/** Validation d’une demande envoyée par un visiteur. */
export type LeadInput = { collection: LeadTarget; id: string; name: string; phone: string; email: string | null; message: string; consent: true }
export function validateLead(body: unknown): { ok: true; lead: LeadInput } | { ok: false; error: string } {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '')
  const collection = b.collection
  const id = typeof b.id === 'number' ? String(b.id) : str(b.id, 12)
  if (typeof collection !== 'string' || !(LEAD_TARGETS as readonly string[]).includes(collection) || !/^[1-9]\d{0,11}$/.test(id)) return { ok: false, error: 'Fiche inconnue.' }
  const name = str(b.name, 80)
  if (name.length < 2) return { ok: false, error: 'Indiquez votre nom.' }
  const phone = str(b.phone, 30)
  const digits = phone.replace(/\D/g, '')
  if (!/^[+\d\s().-]+$/.test(phone) || digits.length < 9 || digits.length > 15) return { ok: false, error: 'Numéro de téléphone invalide.' }
  const email = str(b.email, 120)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, error: 'Adresse email invalide.' }
  const message = typeof b.message === 'string' ? b.message.trim().slice(0, 1000) : ''
  if (message.length < 5) return { ok: false, error: 'Expliquez votre demande en quelques mots.' }
  if (b.consent !== true) return { ok: false, error: 'Cochez la case d’accord pour transmettre vos coordonnées.' }
  return { ok: true, lead: { collection: collection as LeadTarget, id, name, phone, email: email || null, message, consent: true } }
}
