/**
 * Mesure d’audience des fiches — règles pures (aucun accès à la base), testées.
 * Pas de cookie, pas de donnée personnelle : seuls des compteurs agrégés par jour et par fiche sont écrits.
 */
export type MetricKind = 'view' | 'call' | 'whatsapp' | 'directions' | 'share' | 'lead'
export type MetricTarget = { collection: string; id: string }

/** Collections mesurées (liste blanche). */
export const METRIC_COLLECTIONS = ['places', 'practitioners', 'providers'] as const
/** Types d’évènement acceptés par le beacon public (`lead` est compté côté serveur seulement). */
export const BEACON_KINDS: readonly MetricKind[] = ['view', 'call', 'whatsapp', 'directions', 'share']
export const METRIC_KINDS: readonly MetricKind[] = [...BEACON_KINDS, 'lead']

/** Colonne SQL de `metrics_daily` pour chaque évènement (liste fermée : jamais de nom de colonne venant du visiteur). */
export const METRIC_COLUMN: Record<MetricKind, 'views' | 'calls' | 'whatsapp' | 'directions' | 'shares' | 'leads'> = {
  view: 'views',
  call: 'calls',
  whatsapp: 'whatsapp',
  directions: 'directions',
  share: 'shares',
  lead: 'leads',
}

export const isMetricCollection = (c: unknown): c is (typeof METRIC_COLLECTIONS)[number] => typeof c === 'string' && (METRIC_COLLECTIONS as readonly string[]).includes(c)

/** Identifiant de fiche : entier positif (Payload/Postgres), sous forme de texte. */
export const isMetricId = (i: unknown): i is string => typeof i === 'string' && /^[1-9]\d{0,11}$/.test(i)

/** Corps du beacon `{ c, i, k }` → évènement valide, ou null. */
export function parseBeacon(body: unknown): { target: MetricTarget; kind: MetricKind } | null {
  if (!body || typeof body !== 'object') return null
  const { c, i, k } = body as Record<string, unknown>
  const id = typeof i === 'number' ? String(i) : i
  if (!isMetricCollection(c) || !isMetricId(id) || typeof k !== 'string' || !BEACON_KINDS.includes(k as MetricKind)) return null
  return { target: { collection: c, id }, kind: k as MetricKind }
}

const BOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python|axios|node-fetch|go-http|java\/|httpclient|playwright|puppeteer/i

/** Robots, aperçus de liens et outils : jamais comptés. Sans user-agent : ignoré aussi. */
export const isBot = (ua: string | null | undefined) => !ua || ua.length < 10 || BOTS.test(ua)

/**
 * Limite de débit en mémoire (par instance, fenêtre fixe) : aucune écriture en base pour une visite isolée.
 * Renvoie vrai si la clé a dépassé `max` évènements dans la fenêtre.
 */
export function memoryLimiter(max: number, windowMs: number, cap = 5000) {
  const seen = new Map<string, { n: number; reset: number }>()
  return (key: string, now = Date.now()): boolean => {
    const cur = seen.get(key)
    if (!cur || cur.reset <= now) {
      if (seen.size >= cap) for (const [k, v] of seen) if (v.reset <= now || seen.size >= cap) seen.delete(k)
      seen.set(key, { n: 1, reset: now + windowMs })
      return false
    }
    cur.n += 1
    return cur.n > max
  }
}

export type MetricTotals = { views: number; calls: number; whatsapp: number; directions: number; shares: number; leads: number }

const n = (v: number) => v.toLocaleString('fr-FR')

/** Texte du rapport de visibilité, prêt à envoyer (copié par l’équipe, jamais envoyé automatiquement). */
export function visibilityText(name: string, t: MetricTotals, days: number): string {
  const contacts = t.calls + t.whatsapp + t.directions + t.leads
  const lines = [
    `Bonjour,`,
    ``,
    `Voici la visibilité de « ${name} » sur DALIL (mydalil.com) ces ${days} derniers jours :`,
    `• ${n(t.views)} vue${t.views > 1 ? 's' : ''} de la fiche`,
    `• ${n(t.calls)} appel${t.calls > 1 ? 's' : ''} lancé${t.calls > 1 ? 's' : ''} depuis la fiche`,
    `• ${n(t.whatsapp)} contact${t.whatsapp > 1 ? 's' : ''} WhatsApp`,
    `• ${n(t.directions)} demande${t.directions > 1 ? 's' : ''} d’itinéraire`,
    `• ${n(t.leads)} demande${t.leads > 1 ? 's' : ''} reçue${t.leads > 1 ? 's' : ''} (devis, rappel, pré-inscription)`,
  ]
  if (t.shares) lines.push(`• ${n(t.shares)} partage${t.shares > 1 ? 's' : ''} de la fiche`)
  lines.push(``, contacts ? `Soit ${n(contacts)} prise${contacts > 1 ? 's' : ''} de contact au total.` : `Aucune prise de contact sur la période.`, ``, `L’équipe DALIL`)
  return lines.join('\n')
}

/** Ligne SQL → totaux numériques (valeurs absentes = 0). */
export const totalsOf = (row: Record<string, unknown> | undefined): MetricTotals => ({
  views: Number(row?.views ?? 0),
  calls: Number(row?.calls ?? 0),
  whatsapp: Number(row?.whatsapp ?? 0),
  directions: Number(row?.directions ?? 0),
  shares: Number(row?.shares ?? 0),
  leads: Number(row?.leads ?? 0),
})
