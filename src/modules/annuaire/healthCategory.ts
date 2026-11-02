/**
 * Contrôle de cohérence des catégories de santé (audit public du 2 novembre 2026, D06) : le nom d’un établissement
 * contredit-il sa catégorie ? Règle écrite, sans IA, testée (`healthCategory.test.ts`). Utilisée par l’import (classement
 * à l’arrivée) et par la migration de correction des fiches existantes.
 */
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const VET = /(veterin|\bvet\b|\bveto\b|بيطري)/
const PHARMACY = /(^|\s|-)(pharmac|parapharm)|صيدلي/
const DENTAL = /(dentaire|dentiste|orthodont|طب الأسنان)/
const CLINIC = /(^|\s)(clinique|polyclinique|عيادة|مصحة)/
const LAB = /(laboratoire|labo\b|analyses medicales|مخبر)/
const NOT_LAB = /(prothese|pharmaceutique)/
const DOCTOR = /(^|\s)(dr\.?|docteur|cabinet|gyn[eé]co|pediatre|cardiolog|dermato|ophtalm|orl\b|طبيب)/
const NOT_CARE = /(equipement medical|materiel medical|cosmetique)/

/** Catégorie attendue d’après le nom, ou null si le nom ne contredit pas la catégorie actuelle. */
export function expectedHealthCategory(name: string, category: string): string | null {
  const n = norm(name)
  if (VET.test(n)) return category === 'Vétérinaires' ? null : 'Vétérinaires'
  if (NOT_CARE.test(n) && !PHARMACY.test(n)) return null // à revoir à la main : signalé, pas déplacé
  if (PHARMACY.test(n)) return category === 'Pharmacies' ? null : 'Pharmacies'
  if (LAB.test(n) && !NOT_LAB.test(n)) return category === 'Laboratoires' ? null : 'Laboratoires'
  if (category === 'Pharmacies') {
    if (CLINIC.test(n) || DENTAL.test(n)) return 'Cliniques'
    if (DOCTOR.test(n)) return 'Médecins'
  }
  return null
}

/** Nom qui sort du soin humain (matériel, cosmétiques) : signalé pour une revue humaine. */
export const needsHealthReview = (name: string) => NOT_CARE.test(norm(name)) && !PHARMACY.test(norm(name))
