/** Rubriques de DALIL qu’une tâche d’agent peut viser. « Vie musulmane » n’y figure pas : elle est gérée à 100 % par le patron. */
export const RUBRIQUES = [
  { label: 'Découvrir', value: 'decouvrir' },
  { label: 'Vivre en Algérie', value: 'vivre' },
  { label: 'Démarches', value: 'demarches' },
  { label: 'Services', value: 'services' },
  { label: 'Annonces', value: 'annonces' },
  { label: 'Annuaire', value: 'annuaire' },
  { label: 'Santé', value: 'sante' },
  { label: 'Communauté et avis', value: 'communaute' },
  { label: 'Communication (emails, newsletter, Telegram)', value: 'communication' },
  { label: 'Technique', value: 'technique' },
  { label: 'Pilotage', value: 'pilotage' },
] as const

/** Interdit aux agents, quelle que soit la formulation. Vérifié à chaque écriture. */
export const FORBIDDEN_FOR_AGENTS = ['vie-musulmane', 'vie musulmane', 'hajj', 'omra', 'umrah'] as const

export const touchesForbidden = (...texts: Array<string | null | undefined>) => {
  const t = texts.filter(Boolean).join(' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  return FORBIDDEN_FOR_AGENTS.some((w) => t.includes(w))
}

export const TOOLS = [
  { label: 'Lire l’annuaire et les contenus', value: 'read-content' },
  { label: 'Préparer un brouillon de fiche', value: 'draft-content' },
  { label: 'Recherche web (sources)', value: 'web-search' },
  { label: 'Écrire aux autres agents', value: 'message-agents' },
  { label: 'Créer des sous-tâches', value: 'create-tasks' },
  { label: 'Préparer une réponse email', value: 'draft-email' },
  { label: 'Préparer une publication Telegram', value: 'draft-telegram' },
  { label: 'Lire la boîte de réception', value: 'read-inbox' },
  { label: 'Lire la santé technique', value: 'read-health' },
  { label: 'Donner un avis sur les annonces à contrôler', value: 'review-classifieds' },
] as const

export const TASK_STATUS = [
  { label: 'Nouvelle', value: 'new' },
  { label: 'En cours', value: 'running' },
  { label: 'En pause', value: 'paused' },
  { label: 'À valider', value: 'review' },
  { label: 'Terminée', value: 'done' },
  { label: 'Annulée', value: 'cancelled' },
  { label: 'Échec', value: 'failed' },
] as const
export type TaskStatus = (typeof TASK_STATUS)[number]['value']

/** Statuts qu’un agent peut donner lui-même à sa tâche. Valider, annuler et mettre en pause restent humains. */
export const AGENT_STATUSES: TaskStatus[] = ['running', 'review', 'failed']
