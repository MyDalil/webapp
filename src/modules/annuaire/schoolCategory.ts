/**
 * Niveau d’une fiche rangée dans le fourre-tout « Écoles », lu dans son nom (français, arabe).
 * Rien n’est deviné : un nom qui ne dit pas son niveau rend null et la fiche reste dans « Écoles ».
 * L’ordre compte : « auto-école » avant « école », « école coranique » avant « école primaire ».
 */
export type SchoolTarget = { sector: string; category: string }
const EDU = 'education-formation'
const RULES: [RegExp, SchoolTarget][] = [
  [/auto[\s-]?[ée]col|auto[\s-]?school|driving school|permis de conduire|سياقة|السياقة/i, { sector: EDU, category: 'Auto-écoles' }],
  [/coranique|[ée]cole du coran|قرآني|القرآن/i, { sector: 'mosquees-priere', category: 'Écoles coraniques' }],
  [/cr[eè]che|jardin d.enfants|garderie|maternelle|روضة|حضانة/i, { sector: EDU, category: 'Crèches' }],
  [/lyc[ée]e|ثانوي/i, { sector: EDU, category: 'Lycées' }],
  [/(^|[^a-zà-ÿ])c\.?\s?e\.?\s?m\.?([^a-zà-ÿ]|$)|coll[èe]ge|متوسط|[إا]كمالي/i, { sector: EDU, category: 'Collèges' }],
  [/primaire|[ée]l[ée]mentaire|[إا]بتدائي/i, { sector: EDU, category: 'Écoles primaires' }],
  [/universit|facult[ée]|جامعة|كلية/i, { sector: EDU, category: 'Universités' }],
  [/c\.?f\.?p\.?a|formation professionnelle|centre de formation|تكوين مهني|التكوين المهني/i, { sector: EDU, category: 'Formation professionnelle' }],
  [/[ée]cole de langues|language (school|center|centre)|centre de langues|institut de langues/i, { sector: EDU, category: 'Écoles de langues' }],
]

export function schoolCategory(name: string): SchoolTarget | null {
  for (const [re, target] of RULES) if (re.test(name)) return target
  return null
}
