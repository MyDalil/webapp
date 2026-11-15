/**
 * Rangement des catégories fourre-tout d’après le nom de la fiche (même méthode que `schoolCategory`).
 * Rien n’est deviné : un nom qui ne dit rien rend null et la fiche garde sa catégorie.
 */
type Rule = [RegExp, string]
const RULES: Record<string, Rule[]> = {
  Médecins: [[/dentaire|dental|dentist|orthodon|stomatolog|الأسنان|الاسنان/i, 'Dentistes']],
  'Services automobiles': [
    [/station[\s-]?service|station d.essence|naftal|sirghaz|carburant|gpl|محطة (ال)?(وقود|بنزين|خدمات)|نفطال/i, 'Stations-service'],
    [/lavage|car ?wash|wash|detailing|غسيل/i, 'Lavage auto'],
    [/pi[èe]ces|rechange|auto ?parts|accessoires|lubrifiant|pneu|batterie|قطع غيار/i, 'Pièces et accessoires auto'],
  ],
  Administrations: [
    [/minist[èe]re|وزارة/i, 'Ministères'],
    [/tribunal|cour de|palais de justice|محكمة|مجلس قضاء/i, 'Tribunaux'],
    [/(^|[^a-z])(cnas|casnos|cnr|cnac)([^a-z]|$)|s[ée]curit[ée] sociale|الضمان الاجتماعي/i, 'Sécurité sociale'],
    [/imp[ôo]ts|douane|tr[ée]sor|الضرائب|الجمارك/i, 'Impôts et douanes'],
    [/da[ïi]ra|si[èe]ge de la wilaya|دائرة|مقر (ال)?ولاية/i, 'Wilayas et daïras'],
    [/(^|[^a-z])(apc|commune|mairie)([^a-z]|$)|بلدية/i, 'Services municipaux'],
  ],
}
export const RULED_CATEGORIES = Object.keys(RULES)

export function refinedCategory(category: string, name: string): string | null {
  for (const [re, target] of RULES[category] ?? []) if (re.test(name)) return target
  return null
}
