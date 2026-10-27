/** Règles pures de l’accompagnement (testées : rules.test.ts). */

export type Mode = 'cache' | 'liste-attente' | 'ouvert'

/**
 * Mode réellement appliqué. En production : le réglage de /admin (« caché » par défaut).
 * Hors production (preview, CI, local), « caché » devient « liste d’attente » pour que l’équipe voie l’offre avant le lancement.
 */
export function effectiveMode(setting: Mode | null | undefined, env: string | undefined): Mode {
  const mode = setting ?? 'cache'
  if (mode === 'cache' && env !== 'production') return 'liste-attente'
  return mode
}

export type PriceInput = { priceEur?: number | null; priceDa?: number | null }

/** Prix affiché : jamais inventé. Sans prix saisi dans /admin, le tarif est annoncé au lancement. */
export function priceLabel(p: PriceInput): { main: string; sub: string | null } {
  const eur = typeof p.priceEur === 'number' && p.priceEur > 0 ? p.priceEur : null
  const da = typeof p.priceDa === 'number' && p.priceDa > 0 ? p.priceDa : null
  const fmt = (n: number) => n.toLocaleString('fr-FR').replace(/ /g, ' ')
  if (!eur && !da) return { main: 'Tarif annoncé au lancement', sub: null }
  if (eur && da) return { main: `${fmt(eur)} €`, sub: `ou ${fmt(da)} DA` }
  if (eur) return { main: `${fmt(eur)} €`, sub: 'Équivalent en dinars annoncé au lancement' }
  return { main: `${fmt(da!)} DA`, sub: null }
}

/** Numéro WhatsApp au format international (chiffres seulement, 8 à 15). */
export const isWhatsApp = (v: unknown) => typeof v === 'string' && /^\+?\d{8,15}$/.test(v.replace(/[\s.-]/g, ''))
