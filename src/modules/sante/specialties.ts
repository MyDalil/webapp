/** Spécialités proposées à la réservation. Les pratiques complémentaires sont signalées comme telles. */
export const SPECIALTIES = [
  { value: 'medecine-generale', label: 'Médecin généraliste', group: 'Médecine' },
  { value: 'pediatrie', label: 'Pédiatre', group: 'Médecine' },
  { value: 'gynecologie', label: 'Gynécologue', group: 'Médecine' },
  { value: 'cardiologie', label: 'Cardiologue', group: 'Médecine' },
  { value: 'dermatologie', label: 'Dermatologue', group: 'Médecine' },
  { value: 'ophtalmologie', label: 'Ophtalmologue', group: 'Médecine' },
  { value: 'orl', label: 'ORL', group: 'Médecine' },
  { value: 'psychiatrie', label: 'Psychiatre', group: 'Médecine' },
  { value: 'endocrinologie', label: 'Endocrinologue', group: 'Médecine' },
  { value: 'gastro-enterologie', label: 'Gastro-entérologue', group: 'Médecine' },
  { value: 'rhumatologie', label: 'Rhumatologue', group: 'Médecine' },
  { value: 'dentiste', label: 'Chirurgien-dentiste', group: 'Soins' },
  { value: 'orthodontie', label: 'Orthodontiste', group: 'Soins' },
  { value: 'sage-femme', label: 'Sage-femme', group: 'Soins' },
  { value: 'kinesitherapie', label: 'Kinésithérapeute', group: 'Soins' },
  { value: 'orthophonie', label: 'Orthophoniste', group: 'Soins' },
  { value: 'psychologie', label: 'Psychologue', group: 'Soins' },
  { value: 'dietetique', label: 'Diététicien·ne', group: 'Soins' },
  { value: 'hijama', label: 'Hijama', group: 'Pratiques complémentaires' },
  { value: 'naturopathie', label: 'Naturopathie', group: 'Pratiques complémentaires' },
] as const

export type Specialty = (typeof SPECIALTIES)[number]['value']
export const specialtyLabel = (v: string) => SPECIALTIES.find((s) => s.value === v)?.label ?? v
export const isComplementary = (v: string) => SPECIALTIES.find((s) => s.value === v)?.group === 'Pratiques complémentaires'

export { LANGUAGES, languageLabel } from '@/platform/referentiel/languages'

export const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'] as const
