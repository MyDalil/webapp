import type { ComponentType } from 'react'
import { FavoriteButton } from '@/modules/membres/ui'
import { NewsletterForm } from '@/modules/communication/ui'
import { GuidedSearch } from '@/modules/recherche/ui'
import { TestExperience } from '@/modules/membres/ui'
import { ApplicationForm } from '@/modules/pros/ui'
import { ContributionForm } from '@/modules/communaute/ui'
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
