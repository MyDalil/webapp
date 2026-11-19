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

const ACRONYMS = new Set(['CHU', 'CHR', 'EHS', 'EPH', 'EPSP', 'CEM', 'APC', 'CNAS', 'CASNOS', 'ANEM', 'ENS', 'USTHB', 'UMMTO', 'SNTF', 'ETUSA', 'CFPA', 'INSFP', 'PTT', 'BNA', 'CPA', 'BEA', 'BADR', 'CNEP', 'BDL', 'AGB', 'SGA', 'CRA', 'ONU', 'SARL', 'EURL', 'SPA', 'EPIC', 'ENP', 'ESI', 'INPS', 'DSP', 'CRAAG', 'INPED', 'ENSV', 'CNFPH', 'INSIM', 'ENSA', 'ENSH', 'ENST', 'INFSPM', 'ENSSEA', 'ENSB', 'INATAA', 'CREDEG', 'DGSN', 'APN', 'CNRC', 'CACI', 'CAAR', 'SAA', 'CAAT', 'OPGI', 'AADL', 'CNL', 'ENPI', 'CNR', 'CAF', 'FAF'])
const SMALL = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'et', 'à', 'a', 'au', 'aux', 'en', 'pour', 'sur', 'par'])

/**
 * Nom écrit tout en majuscules (« ECOLE PRIMAIRE EL AMIR ») : casse normale, comme les autres fiches.
 * Sigles connus gardés (CHU, EHS, CEM, APC…). Un nom en casse mixte n'est pas touché.
 */
export function tidyCase(name: string): string {
  const letters = name.replace(/[^A-Za-zÀ-ÿ]/g, '')
  if (letters.length < 4 || letters !== letters.toUpperCase()) return name
  let first = true
  return name.replace(/[A-Za-zÀ-ÿ]+/g, (w, at: number) => {
    const low = w.toLowerCase()
    const dotted = name[at - 1] === '.' || name[at + w.length] === '.'
    const out = (w.length === 1 && dotted) || isAcronym(w) ? w : !first && SMALL.has(low) ? low : low[0].toUpperCase() + low.slice(1)
    first = false
    return out
  })
}

/**
 * Sigle à garder en majuscules : liste connue, ou mot court (5 lettres au plus) sans voyelle ou avec 3 consonnes de suite
 * (ENSV, CNFPH, INSFP). Évite « Ensv » ou « Cnfph » (constat Fable, 19 nov. 2026). Un mot courant (ÉCOLE, STADE) n'est pas touché.
 */
export function isAcronym(w: string): boolean {
  if (ACRONYMS.has(w)) return true
  if (w.length < 2 || w.length > 5) return false
  return !/[AEIOUYÀ-ÿ]/i.test(w) || /[^AEIOUYÀ-ÿ]{3}/i.test(w)
}

/** Nom avec les accents français rétablis et sans majuscules partout. Un nom déjà juste ressort identique. */
export function accentFr(name: string): string {
  return tidyCase(name).replace(/[A-Za-z]+/g, (w) => {
    const fixed = WORDS[w.toLowerCase()]
    return fixed ? restore(w, fixed) : w
  })
}

/**
 * Nom importé en plusieurs langues dans un seul champ (« Stade du 5 juillet | 5 July Stadium | ملعب 5 جويلية ») :
 * le français reste le nom, l’arabe et l’anglais vont dans leurs champs. Un nom sans « | » ressort seulement accentué.
 */
export function splitPlaceName(name: string): { name: string; nameEn?: string; nameAr?: string } {
  const parts = name.split(/\s+\|\s+/).map((p) => p.trim()).filter(Boolean)
  if (parts.length < 2) return { name: accentFr(name) }
  const arabic = (s: string) => /[؀-ۿ]/.test(s)
  const latin = parts.filter((p) => !arabic(p))
  return { name: accentFr(latin[0] ?? parts[0]), nameEn: latin[1], nameAr: parts.find(arabic) }
}
