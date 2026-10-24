/** Langues parlées par les professionnels et les praticiens (valeurs stables, enregistrées en base). */
export const LANGUAGES = [
  { value: 'ar', label: 'Arabe' },
  { value: 'kab', label: 'Tamazight' },
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'Anglais' },
] as const

export const languageLabel = (v: string) => LANGUAGES.find((l) => l.value === v)?.label ?? v
