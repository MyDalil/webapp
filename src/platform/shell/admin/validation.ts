/**
 * Vue « Validation » de /admin : une seule file de ce qui attend un clic d’administrateur (logique pure, testée).
 * Chaque bouton appelle une action du registre (canal « admin ») : jamais d’écriture directe depuis la vue.
 */
import type { Where } from './accueil'

export type Op = 'publier' | 'rejeter' | 'activer'
export type Queue = { key: string; collection: string; label: string; where: Where; ops: Op[]; opLabel?: Partial<Record<Op, string>> }

const FICHE: Op[] = ['publier', 'rejeter']
export const QUEUES: Queue[] = [
  { key: 'places', collection: 'places', label: 'Adresse', where: { _status: { equals: 'draft' } }, ops: FICHE },
  { key: 'practitioners', collection: 'practitioners', label: 'Praticien', where: { status: { equals: 'pending' } }, ops: FICHE },
  { key: 'providers', collection: 'providers', label: 'Prestataire', where: { status: { equals: 'pending' } }, ops: FICHE },
  { key: 'classifieds', collection: 'classifieds', label: 'Annonce', where: { status: { equals: 'pending' } }, ops: FICHE },
  { key: 'procedures', collection: 'procedures', label: 'Démarche', where: { status: { equals: 'draft' } }, ops: FICHE },
  { key: 'claims', collection: 'claims', label: 'Revendication', where: { status: { equals: 'en_attente' } }, ops: ['activer', 'rejeter'], opLabel: { activer: 'Accepter', rejeter: 'Refuser' } },
  { key: 'subscriptions', collection: 'subscriptions', label: 'Abonnement', where: { status: { equals: 'en_attente' } }, ops: ['activer', 'rejeter'], opLabel: { rejeter: 'Annuler' } },
  { key: 'payments', collection: 'payments', label: 'Paiement', where: { status: { equals: 'en_attente' } }, ops: ['activer', 'rejeter'], opLabel: { activer: 'Reçu', rejeter: 'Annuler' } },
  { key: 'submissions', collection: 'submissions', label: 'Contribution', where: { status: { in: ['new', 'processing', 'needs_info'] } }, ops: [] },
]

export const OP_LABEL: Record<Op, string> = { publier: 'Publier', rejeter: 'Rejeter', activer: 'Activer' }
export const opLabel = (q: Queue, op: Op) => q.opLabel?.[op] ?? OP_LABEL[op]

/** Bouton → action du registre et son entrée. `null` = opération impossible pour ce type. Note : motif ou note de paiement. */
export function actionFor(key: string, op: string, id: number, note = ''): { name: string; input: Record<string, unknown> } | null {
  const q = QUEUES.find((x) => x.key === key)
  if (!q || !(q.ops as string[]).includes(op) || !Number.isInteger(id) || id < 1) return null
  const text = note.trim().slice(0, 500)
  if (['places', 'practitioners', 'providers', 'classifieds', 'procedures'].includes(key))
    return op === 'publier' ? { name: 'publier_fiche', input: { collection: key, id } } : { name: 'rejeter_fiche', input: { collection: key, id, motif: text || 'Refusé à la relecture.' } }
  if (key === 'claims') return { name: 'decider_revendication', input: { id, decision: op === 'activer' ? 'acceptee' : 'refusee', ...(text ? { note: text } : {}) } }
  if (key === 'subscriptions') return op === 'activer' ? { name: 'activer_abonnement', input: { id, ...(text ? { note: text } : {}) } } : { name: 'refuser_abonnement', input: { id, ...(text ? { motif: text } : {}) } }
  if (key === 'payments') return { name: 'valider_paiement', input: { id, ...(op === 'rejeter' ? { annuler: true } : {}), ...(text ? { note: text } : {}) } }
  return null
}

/** Titre lisible d’un élément de la file (champ titre de la collection, sinon repli explicite). */
export function itemTitle(key: string, d: Record<string, unknown>): string {
  const s = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
  const fiche = `${s(d.targetCollection) ?? ''} n° ${s(String(d.targetId ?? '')) ?? '?'}`
  switch (key) {
    case 'claims':
      return `Fiche ${fiche}`
    case 'subscriptions':
      return `${s(d.plan) ?? 'Formule ?'} — fiche ${fiche}`
    case 'payments': {
      const amount = typeof d.amount === 'number' ? `${(d.amount / 100).toLocaleString('fr-FR')} ${s(d.currency) ?? ''}`.trim() : 'montant ?'
      return `${amount} — ${s(d.provider) ?? 'moyen ?'}${s(d.reference) ? ` (${s(d.reference)})` : ''}`
    }
    default:
      return s(d.name) ?? s(d.displayName) ?? s(d.title) ?? s(d.subject) ?? `n° ${String(d.id)}`
  }
}

/** Requête venue de la page /admin elle-même : en-tête Origin absent ou identique à l’adresse appelée (anti-CSRF). */
export function sameOrigin(origin: string | null, url: string): boolean {
  if (!origin) return true
  try {
    return new URL(origin).origin === new URL(url).origin
  } catch {
    return false
  }
}
