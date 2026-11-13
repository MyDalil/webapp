import type { Tab } from 'payload'
import type { Place } from '@/payload-types'
import { APIError, type CollectionBeforeChangeHook } from 'payload'
import { SECTORS } from '@/platform/referentiel/catalog'
import { isAdminField, isStaffField, mayPublish } from '@/platform/access'

/**
 * Moteur de confiance DALIL : statuts, critères, sources et date de vérification.
 * Ce module définit le vocabulaire de la vérification ; il ne dépend d’aucun revenu commercial.
 */

export const PLACE_STATUS = [
  { label: 'Repérée — à vérifier', value: 'spotted' },
  { label: 'En cours de vérification', value: 'checking' },
  { label: 'Vérifiée par DALIL', value: 'verified' },
  { label: 'Labellisée Excellence', value: 'labelled' },
] as const

export const CRITERION_RESULTS = [
  { label: 'À confirmer', value: 'pending' },
  { label: 'Conforme', value: 'ok' },
  { label: 'Partiel', value: 'partial' },
  { label: 'Non conforme', value: 'ko' },
  { label: 'Non concerné', value: 'na' },
] as const

export const STATUS_LABEL: Record<NonNullable<Place['verification']>, string> = {
  spotted: 'À vérifier',
  checking: 'En vérification',
  verified: 'Vérifiée',
  labelled: 'Label Excellence',
}

export const RESULT_LABEL: Record<string, string> = {
  pending: 'À confirmer',
  ok: 'Conforme',
  partial: 'Partiel',
  ko: 'Non conforme',
  na: 'Non concerné',
}

/**
 * Critères de qualité (validés par Rad, 2026-10-17) : un socle commun en tête de chaque fiche, puis les critères
 * propres au secteur. Les équivalents fusionnent dans le socle ; un service sans lieu d’accueil ne reçoit que ce
 * qui s’évalue de façon fiable ; nature, climat, bien-être et qualité de vie là où ils ont du sens.
 */
export const COMMON_CRITERIA = ['Propreté', 'Accueil et respect', 'Tranquillité', 'Accessibilité', 'Sécurité et confort', 'Qualité des services'] as const
const SERVICE_CRITERIA = ['Accueil et respect', 'Accessibilité', 'Qualité des services'] as const
/** Secteurs sans lieu d’accueil du public (agences, artisans, transport, conseil). */
const SERVICE_SECTORS = ['logement-immobilier', 'maison-travaux', 'transports-mobilite', 'droit-finance-conseil']
/** Ancien intitulé du secteur → critère du socle qui le remplace. */
const SAME_AS: Record<string, string> = {
  Hygiène: 'Propreté',
  'Service et accueil': 'Accueil et respect',
  Accueil: 'Accueil et respect',
  Bruit: 'Tranquillité',
  Sécurité: 'Sécurité et confort',
  Confort: 'Sécurité et confort',
}
const EXTRA: Record<string, string[]> = {
  'culture-nature-loisirs': ['Nature et environnement', 'Climat'],
  'hebergement-sejours': ['Nature et environnement', 'Climat', 'Bien-être'],
  'bien-etre-sport': ['Bien-être'],
  'logement-immobilier': ['Qualité de vie'],
}

/** Liste ordonnée des critères d’un secteur. */
export function criteriaNames(sector: string): string[] {
  const own = SECTORS.find((s) => s.slug === sector)?.criteria ?? []
  const base: readonly string[] = SERVICE_SECTORS.includes(sector) ? SERVICE_CRITERIA : COMMON_CRITERIA
  const specific = own.map((c) => SAME_AS[c] ?? c).filter((c) => !base.includes(c) && !(COMMON_CRITERIA as readonly string[]).includes(c))
  return [...new Set([...base, ...specific, ...(EXTRA[sector] ?? [])])]
}

/** Critères du secteur, à confirmer, pré-remplis à la création d’une fiche. */
export const criteriaFor = (sector: string) => criteriaNames(sector).map((criterion) => ({ criterion, result: 'pending' as const }))

type Criterion = { criterion: string; result: string; note?: string | null }
/** Nouvelle liste pour une fiche existante : les résultats et précisions déjà saisis sont conservés (équivalents compris). */
export function mergeCriteria(sector: string, current: Criterion[]): Criterion[] {
  const known = new Map<string, Criterion>()
  for (const c of current) known.set(SAME_AS[c.criterion] ?? c.criterion, c)
  const list = criteriaNames(sector).map((name) => {
    const k = known.get(name)
    return k ? { criterion: name, result: k.result, note: k.note ?? null } : { criterion: name, result: 'pending', note: null }
  })
  // Un critère saisi à la main qui n’est plus dans la liste n’est jamais perdu.
  for (const [name, c] of known) if (!list.some((x) => x.criterion === name)) list.push({ criterion: name, result: c.result, note: c.note ?? null })
  return list
}

/** Onglet « Vérification » commun à toute entité vérifiable (aujourd’hui : les adresses). */
/** Statuts de confiance : attribués par un administrateur seulement (jamais par un rédacteur, un agent ou un pro). */
const trustAccess = { create: isAdminField, update: isAdminField }

/** Onglet « Vérification » commun à toute entité vérifiable (aujourd’hui : les adresses). */
export const verificationTab: Tab = {
  label: 'Vérification',
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'verification', type: 'select', label: 'Statut DALIL', required: true, defaultValue: 'spotted', options: [...PLACE_STATUS], access: trustAccess },
        { name: 'verifiedAt', type: 'date', label: 'Dernière vérification', access: trustAccess, admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMMM yyyy' } } },
        { name: 'verifiedBy', type: 'text', label: 'Vérifiée par', access: trustAccess },
        { name: 'nextVerificationAt', type: 'date', label: 'Prochaine vérification', access: trustAccess, admin: { description: 'Échéance de revérification. Calculée à 12 mois si vide.', date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMMM yyyy' } } },
      ],
    },
    {
      name: 'criteria',
      type: 'array',
      label: 'Critères DALIL',
      labels: { singular: 'Critère', plural: 'Critères' },
      access: trustAccess,
      admin: { description: 'Pré-remplis selon le secteur. Mettez à jour après chaque visite.' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'criterion', type: 'text', label: 'Critère', required: true },
            { name: 'result', type: 'select', label: 'Résultat', required: true, defaultValue: 'pending', options: [...CRITERION_RESULTS] },
            { name: 'note', type: 'text', label: 'Précision' },
          ],
        },
      ],
    },
    {
      name: 'sources',
      type: 'array',
      label: 'Sources',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'label', type: 'text', label: 'Libellé' },
            { name: 'url', type: 'text', label: 'Lien', required: true },
          ],
        },
      ],
    },
    {
      name: 'provenance',
      type: 'array',
      label: 'Provenance par champ',
      labels: { singular: 'Champ', plural: 'Provenance par champ' },
      access: { read: isStaffField },
      admin: { description: 'Pour chaque champ sensible (téléphone, adresse, horaires…) : source, identifiant source, date de collecte, méthode, date de vérification, responsable. Une valeur en conflit est gardée ici, jamais écrasée.' },
      fields: [
        { type: 'row', fields: [{ name: 'field', type: 'text', label: 'Champ', required: true }, { name: 'value', type: 'text', label: 'Valeur relevée' }, { name: 'conflict', type: 'checkbox', label: 'En conflit' }] },
        { type: 'row', fields: [{ name: 'source', type: 'text', label: 'Source', required: true }, { name: 'sourceId', type: 'text', label: 'Identifiant source' }, { name: 'collectedAt', type: 'date', label: 'Collectée le' }] },
        { type: 'row', fields: [{ name: 'method', type: 'select', label: 'Méthode', options: [{ label: 'Import de données ouvertes', value: 'import' }, { label: 'Site officiel', value: 'official' }, { label: 'Appel téléphonique', value: 'phone' }, { label: 'Visite sur place', value: 'visit' }, { label: 'Déclaration du professionnel', value: 'pro' }, { label: 'Contribution d’un visiteur', value: 'contribution' }] }, { name: 'checkedAt', type: 'date', label: 'Vérifiée le' }, { name: 'checkedBy', type: 'text', label: 'Responsable' }] },
      ],
    },
    { name: 'internalNote', type: 'textarea', label: 'Note interne (jamais publiée)', access: { read: isStaffField } },
  ],
}

const TRUST_FIELDS = ['verification', 'verifiedAt', 'verifiedBy', 'nextVerificationAt', 'criteria']

type Proof = { verification?: string | null; verifiedAt?: string | null; verifiedBy?: string | null; sources?: { url?: string | null }[] | null; criteria?: { result?: string | null }[] | null; nextVerificationAt?: string | null }

/** Ce qui manque pour attribuer un statut de confiance (règle du module, testée). Vide = statut accepté. */
export function missingProof(doc: Proof): string[] {
  if (doc.verification !== 'verified' && doc.verification !== 'labelled') return []
  const missing: string[] = []
  if (!doc.verifiedAt || Number.isNaN(Date.parse(doc.verifiedAt))) missing.push('date de vérification')
  else if (Date.parse(doc.verifiedAt) > Date.now() + 864e5) missing.push('date de vérification passée (pas dans le futur)')
  if (!doc.verifiedBy?.trim()) missing.push('auteur de la vérification')
  if (!(doc.sources ?? []).some((s) => /^https?:\/\/\S+\.\S+/.test(s.url?.trim() ?? ''))) missing.push('au moins une source exploitable (lien)')
  const criteria = doc.criteria ?? []
  if (!criteria.length) missing.push('critères du secteur')
  else if (doc.verification === 'labelled' && criteria.some((c) => c.result === 'pending' || c.result === 'ko')) missing.push('tous les critères évalués et aucun non conforme (label)')
  return missing
}

/** Revérification par défaut : 12 mois après la vérification. */
export const nextCheck = (verifiedAt: string) => new Date(Date.parse(verifiedAt) + 365 * 864e5).toISOString()

/** Refuse « Vérifiée » / « Labellisée » sans preuves (création, mise à jour partielle, import). */
export const requireProof: CollectionBeforeChangeHook = ({ data, originalDoc, req }) => {
  // Les champs de confiance envoyés par un compte non habilité sont ignorés (retirés par le contrôle d’accès du champ).
  const own = mayPublish(req?.user) ? (data ?? {}) : Object.fromEntries(Object.entries(data ?? {}).filter(([k]) => !TRUST_FIELDS.includes(k)))
  const next = { ...(originalDoc ?? {}), ...own } as Proof
  const missing = missingProof(next)
  if (missing.length) throw new APIError(`Statut « ${next.verification === 'labelled' ? 'Labellisée' : 'Vérifiée'} » refusé : il manque ${missing.join(', ')}.`, 400, null, true)
  if (data && mayPublish(req?.user) && (next.verification === 'verified' || next.verification === 'labelled') && next.verifiedAt && !next.nextVerificationAt) data.nextVerificationAt = nextCheck(next.verifiedAt)
  return data
}
