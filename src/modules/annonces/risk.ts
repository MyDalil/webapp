/**
 * Score anti-arnaque d’une annonce : une aide au contrôle, jamais une décision.
 * Chaque point vient d’un signal nommé et visible ; un humain publie ou refuse (règle du module).
 * Signaux choisis pour les arnaques courantes : paiement avant visite, contact hors DALIL, prix trop bas,
 * pression, compte neuf, rafale d’annonces, texte copié, signalements.
 */
export type RiskInput = {
  title: string
  description: string
  category: string
  price?: number | null
  photos: number
  reports: number
  /** Âge du compte de l’auteur, en jours (null : inconnu ou annonce d’exemple). */
  authorAgeDays?: number | null
  /** Annonces créées par le même auteur ces dernières 24 h (celle-ci comprise). */
  authorLast24h?: number
  /** Prix médian des annonces publiées du même type (null : moins de 5 annonces comparables). */
  medianPrice?: number | null
  /** Autres annonces, d’autres auteurs, avec la même description. */
  sameText?: number
}
export type Signal = { key: string; points: number; label: string }
export type Risk = { score: number; level: 'faible' | 'moyen' | 'eleve'; signals: Signal[] }

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

const PAYMENT = /\b(western ?union|moneygram|mandat ?(cash|postal)?|avance|acompte|frais de (dossier|reservation|livraison)|paiement (avant|d'avance)|virement (avant|d'abord)|ccp avant|baridimob avant|carte cadeau|gift ?card|crypto|bitcoin|usdt)\b/
const OFF_PLATFORM = /(\+?213[\s.-]?|\b0)[5-7](?:[\s.-]?\d){8}\b|[\w.+-]+@[\w-]+\.[a-z]{2,}|\bwhats ?app\b|\bwa\.me\b|\bt\.me\/|\btelegram\b|\bviber\b|\bsignal\b/
const PRESSURE = /\b(urgent|tres urgent|depart (a|pour) l'etranger|je pars|dernier prix|aujourd'hui seulement|premier arrive|sans visite|pas de visite|envoi par transporteur)\b/

export function scoreClassified(a: RiskInput): Risk {
  const text = norm(`${a.title}\n${a.description}`)
  const s: Signal[] = []
  if (PAYMENT.test(text)) s.push({ key: 'paiement', points: 30, label: 'Demande de paiement ou d’avance avant la remise' })
  if (OFF_PLATFORM.test(text)) s.push({ key: 'contact', points: 15, label: 'Téléphone, email ou messagerie dans le texte (contact hors DALIL)' })
  if (PRESSURE.test(text)) s.push({ key: 'pression', points: 10, label: 'Pression ou excuse classique (urgence, départ, sans visite)' })
  if (a.price && a.medianPrice && a.price < a.medianPrice * 0.35) s.push({ key: 'prix', points: 25, label: `Prix très bas : moins de 35 % du prix médian du même type (${Math.round(a.medianPrice).toLocaleString('fr-FR')} DA)` })
  if (a.authorAgeDays != null && a.authorAgeDays < 3) s.push({ key: 'compte', points: 10, label: 'Compte créé il y a moins de 3 jours' })
  if ((a.authorLast24h ?? 0) >= 5) s.push({ key: 'rafale', points: 10, label: `${a.authorLast24h} annonces du même compte en 24 h` })
  if ((a.sameText ?? 0) > 0) s.push({ key: 'copie', points: 20, label: `Texte identique à ${a.sameText} annonce(s) d’un autre compte` })
  if (a.reports > 0) s.push({ key: 'signalements', points: Math.min(45, a.reports * 15), label: `${a.reports} signalement(s)` })
  if (a.photos === 0 && ['immobilier', 'vehicules'].includes(a.category)) s.push({ key: 'photos', points: 5, label: 'Aucune photo pour un bien ou un véhicule' })
  const score = Math.min(100, s.reduce((n, x) => n + x.points, 0))
  return { score, level: score >= 50 ? 'eleve' : score >= 25 ? 'moyen' : 'faible', signals: s.sort((x, y) => y.points - x.points) }
}

/** Médiane (null sous 5 valeurs : comparaison trop fragile). */
export function median(values: number[]): number | null {
  const v = values.filter((x) => Number.isFinite(x) && x > 0).sort((a, b) => a - b)
  if (v.length < 5) return null
  const m = Math.floor(v.length / 2)
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2
}
