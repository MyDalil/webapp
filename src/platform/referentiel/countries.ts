import type { SelectField } from 'payload'

/**
 * Pays d’une donnée (multi-pays, 19 nov. 2026) : liste unique, utilisée par `pros` et `contenus`.
 * Algérie par défaut ; liste ISO 3166-1 courte (diaspora et voisins).
 */
export const COUNTRIES = ['DZ', 'FR', 'BE', 'CA', 'CH', 'ES', 'IT', 'DE', 'GB', 'US', 'TN', 'MA', 'AE', 'QA', 'SA', 'TR'] as const
export type Country = (typeof COUNTRIES)[number]

export const COUNTRY_LABEL: Record<Country, string> = {
  DZ: 'Algérie', FR: 'France', BE: 'Belgique', CA: 'Canada', CH: 'Suisse', ES: 'Espagne', IT: 'Italie', DE: 'Allemagne',
  GB: 'Royaume-Uni', US: 'États-Unis', TN: 'Tunisie', MA: 'Maroc', AE: 'Émirats arabes unis', QA: 'Qatar', SA: 'Arabie saoudite', TR: 'Turquie',
}

/** Champ « Pays » (Payload) : obligatoire, Algérie par défaut, indexé, en barre latérale. */
export const countryField = (): SelectField => ({
  name: 'country',
  type: 'select',
  label: 'Pays',
  required: true,
  defaultValue: 'DZ',
  index: true,
  options: COUNTRIES.map((value) => ({ label: COUNTRY_LABEL[value], value })),
  admin: { position: 'sidebar' },
})
