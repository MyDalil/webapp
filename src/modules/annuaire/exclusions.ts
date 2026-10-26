/**
 * Lieux exclus de DALIL (décision de Rad, 2026-10-26) : écoles et instituts de musique, zaouïas et écoles coraniques
 * soufies ou chiites, lieux qui servent de l’alcool. Règle unique : import (`importPlaces`) et contrôles. Testée.
 */
const RELIGIOUS = new Set(['Mosquées', 'Salles de prière', 'Écoles coraniques', 'Associations caritatives et entraide', 'Pompes funèbres musulmanes et toilette mortuaire'])
const W = (s: string) => new RegExp(`(?<![\\p{L}])(${s})(?![\\p{L}])`, 'iu')
const MUSIC = /musiq|music|conservatoire|موسيق/i
const SUFI = W('zaou[iï]y?a|zaou[iï]et|zaouite|zawiy?a|tidjan[iy]+a|tijaniy+a|qadiriy+a|kadiri+a|rahmaniy+a|alaou?iy+a|alawiy+a|chadh?iliy+a|shadhiliy+a|ta[iï]biy+a|confr[ée]rie|tariqa')
const SUFI_AR = /زاوي|طريقة|تيجاني|قادري|رحماني/
const SHIA = W('chi[iï]tes?|shi[iy]tes?|shia|hus+[ae]?[iy]+n[iy]+y?a')
const SHIA_AR = /شيعي|حسينية/
const QURANIC = /coran|quran|قرآن|قران/i
const ZAOUIA_FIRST = /^\s*(zaou[iï]y?a|zawiy?a|زاوية|الزاوية)/i
const ALCOHOL = W('cabaret|night ?club|discoth[eè]que|piano.?bar|wine ?bar|bar à vins?|brasserie|taverne|pub|beer|bi[eè]re|liquor|spiritueux|caviste')
const ALCOHOL_AR = /خمارة|حانة|ملهى/
const ALCOHOL_SECTORS = new Set(['restaurants-gastronomie', 'hebergement-sejours', 'commerces-achats', 'bien-etre-sport'])

export type ExclusionInput = { name?: string | null; nameAr?: string | null; category?: string | null; sector?: string | null }

/** Motif d’exclusion, ou null si le lieu peut figurer dans DALIL. */
export function exclusionReason(p: ExclusionInput): string | null {
  const name = `${p.name ?? ''} ${p.nameAr ?? ''}`
  const religious = RELIGIOUS.has(p.category ?? '')
  const sufi = SUFI.test(name) || SUFI_AR.test(name)
  if (MUSIC.test(name)) return 'musique'
  if ((religious && sufi) || (QURANIC.test(name) && sufi) || (['education-formation', 'mosquees-priere'].includes(p.sector ?? '') && ZAOUIA_FIRST.test(name))) return 'zaouïa ou confrérie soufie'
  if (religious && (SHIA.test(name) || SHIA_AR.test(name))) return 'lieu chiite'
  if (ALCOHOL_SECTORS.has(p.sector ?? '') && (ALCOHOL.test(name) || ALCOHOL_AR.test(name))) return 'sert de l’alcool'
  return null
}
