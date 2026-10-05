import type { ComponentType } from 'react'
import { FavoriteButton } from './FavoriteButton'
import { NewsletterForm } from './NewsletterForm'
import { GuidedSearch } from './GuidedSearch'
import { TestExperience } from './TestExperience'
import { ApplicationForm } from './ApplicationForm'
import { ContributionForm } from './ContributionForm'
import { DiagnosticWizard } from './DiagnosticWizard'
import { ParallaxPhoto } from './ParallaxPhoto'

/** Composants interactifs du prototype, par nom d’origine. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ISLANDS: Record<string, ComponentType<any>> = {
  FavoriteButton,
  NewsletterForm,
  GuidedSearch,
  TestExperience,
  ApplicationForm,
  ContributionForm,
  DiagnosticWizard,
  ParallaxPhoto,
}
