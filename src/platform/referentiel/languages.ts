/** Langues parlées par les professionnels et les praticiens (valeurs stables, enregistrées en base). */
export const LANGUAGES = [
  { value: 'ar', label: 'Arabe' },
  { value: 'kab', label: 'Tamazight' },
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'Anglais' },
  { value: 'es', label: 'Espagnol' },
  { value: 'it', label: 'Italien' },
  { value: 'de', label: 'Allemand' },
  { value: 'tr', label: 'Turc' },
] as const

export const languageLabel = (v: string) => LANGUAGES.find((l) => l.value === v)?.label ?? v
