/** Démarche sourcée : chaque fait renvoie à ses sources datées (règle DALIL : rien sans source). */
export type Source = { id: string; publisher: string; date: string | null; url: string; official: boolean; title: string }
export type Fact = { text: string; src: string[] }
/** Point clé de la fiche (durée, coût, lieu…) : valeur courte, toujours sourcée. */
export type KeyPoint = { icon: string; label: string; value: string; src: string[] }
export type Tone = 'vert' | 'sable' | 'ciel'

export type Demarche = {
  slug: string
  title: string
  /** Nom court des cartes. */
  short: string
  category: string
  icon: string
  tone: Tone
  /** Illustration de la fiche (public/images/demarches). */
  image: string
  /** Crédit de la photo (auteur · licence), absent pour une illustration DALIL. */
  credit?: string
  /** Une phrase sous le titre des cartes. */
  summary: string
  lead: string
  where: string
  checked: string
  keyPoints: KeyPoint[]
  /** Résumé du guide gratuit en 4 étapes (option 1). */
  outline: string[]
  sections: { title: string; facts: Fact[] }[]
  steps: Fact[]
  faq: { q: string; a: string; src: string[] }[]
  official: { label: string; src: string }[]
  sources: Source[]
}

/** Catégories populaires de la page Démarches. */
export type DemarcheCategory = { key: string; label: string; sub: string; icon: string; href: string; color: 'vert' | 'sable' | 'ciel' | 'corail' | 'violet' }
