/**
 * Accents français manquants dans les noms importés (« Ecole » → « École »).
 * Seulement des mots sans homonyme sans accent : jamais de verbe ni de mot anglais ambigu.
 * La casse d'origine est gardée (« ECOLE » → « ÉCOLE », « ecole » → « école »).
 */
const WORDS: Record<string, string> = {
  ecole: 'école',
  ecoles: 'écoles',
  etablissement: 'établissement',
  etablissements: 'établissements',
  education: 'éducation',
  eleves: 'élèves',
  etudes: 'études',
  etudiant: 'étudiant',
  etudiants: 'étudiants',
  etudiante: 'étudiante',
  etudiantes: 'étudiantes',
  universite: 'université',
  universitaire: 'universitaire',
  superieur: 'supérieur',
  superieure: 'supérieure',
  specialise: 'spécialisé',
  specialisee: 'spécialisée',
  specialises: 'spécialisés',
  specialisees: 'spécialisées',
  handicapes: 'handicapés',
  deficients: 'déficients',
  reeducation: 'rééducation',
  hopital: 'hôpital',
  medical: 'médical',
  medicale: 'médicale',
  medicaux: 'médicaux',
  pediatrique: 'pédiatrique',
  sante: 'santé',
  securite: 'sécurité',
  societe: 'société',
  cooperative: 'coopérative',
  residence: 'résidence',
  bibliotheque: 'bibliothèque',
  mediatheque: 'médiathèque',
  musee: 'musée',
  theatre: 'théâtre',
  mosquee: 'mosquée',
  electricite: 'électricité',
  energie: 'énergie',
  economie: 'économie',
  daira: 'daïra',
}

const restore = (src: string, fixed: string) => {
  if (src === src.toUpperCase() && src.length > 1) return fixed.toUpperCase()
  if (src[0] === src[0].toUpperCase()) return fixed[0].toUpperCase() + fixed.slice(1)
  return fixed
}

/** Nom avec les accents français rétablis. Un nom déjà juste ressort identique. */
export function accentFr(name: string): string {
  return name.replace(/[A-Za-z]+/g, (w) => {
    const fixed = WORDS[w.toLowerCase()]
    return fixed ? restore(w, fixed) : w
  })
}
