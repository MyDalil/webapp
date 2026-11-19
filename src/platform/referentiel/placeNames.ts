/**
 * Autres noms des 69 wilayas : arabe, anglais, darija/tamazight, ancien nom français usuel.
 * Seulement des variantes réelles et connues. Les formes sans accent ni tiret (Bejaia, Setif, Tizi-Ouzou)
 * ne sont pas listées : `placeWords` les retrouve d’elles-mêmes.
 */
export const WILAYA_VARIANTS: Record<number, string[]> = {
  1: ['أدرار'],
  2: ['الشلف', 'El Asnam', 'Orléansville'],
  3: ['الأغواط', 'El Aghouat'],
  4: ['أم البواقي', 'OEB'],
  5: ['باتنة'],
  6: ['بجاية', 'Bgayet', 'Vgayet', 'Bougie'],
  7: ['بسكرة'],
  8: ['بشار', 'Colomb-Béchar'],
  9: ['البليدة'],
  10: ['البويرة', 'Tubiret'],
  11: ['تمنراست', 'Tamanghasset', 'Tamenghest'],
  12: ['تبسة'],
  13: ['تلمسان'],
  14: ['تيارت', 'Tihert'],
  15: ['تيزي وزو', 'Tizi Wezzu'],
  16: ['الجزائر', 'الجزائر العاصمة', 'Algiers', 'Dzayer', 'Dzair', 'El Djazair'],
  17: ['الجلفة'],
  18: ['جيجل', 'Djidjelli', 'Djijel'],
  19: ['سطيف', 'Stif'],
  20: ['سعيدة'],
  21: ['سكيكدة', 'Philippeville'],
  22: ['سيدي بلعباس', 'Sidi Bel Abbes', 'Sidi Belabbes', 'SBA'],
  23: ['عنابة', 'Bône', 'Bona'],
  24: ['قالمة'],
  25: ['قسنطينة', 'Qacentina', 'Ksentina', 'Cirta'],
  26: ['المدية', 'Lemdiya'],
  27: ['مستغانم', 'Mosta'],
  28: ['المسيلة', 'Msila'],
  29: ['معسكر', 'Mouaskar'],
  30: ['ورقلة', 'Wargla'],
  31: ['وهران', 'Wahran'],
  32: ['البيض'],
  33: ['إليزي'],
  34: ['برج بوعريريج', 'BBA'],
  35: ['بومرداس'],
  36: ['الطارف'],
  37: ['تندوف'],
  38: ['تيسمسيلت'],
  39: ['الوادي', 'Oued Souf', 'Souf'],
  40: ['خنشلة'],
  41: ['سوق أهراس'],
  42: ['تيبازة', 'Tipasa'],
  43: ['ميلة'],
  44: ['عين الدفلى'],
  45: ['النعامة'],
  46: ['عين تموشنت'],
  47: ['غرداية'],
  48: ['غليزان', 'Ighil Izane'],
  49: ['تيميمون'],
  50: ['برج باجي مختار'],
  51: ['أولاد جلال'],
  52: ['بني عباس'],
  53: ['عين صالح', 'Aïn Salah'],
  54: ['عين قزام', 'Aïn Guezzam'],
  55: ['تقرت', 'Tuggurt'],
  56: ['جانت'],
  57: ['المغير', 'El Mghair', 'El Meghaier'],
  58: ['المنيعة', 'El Goléa', 'El Menia'],
  59: ['أفلو'],
  60: ['بريكة'],
  61: ['القنطرة'],
  62: ['بئر العاتر'],
  63: ['العريشة'],
  64: ['قصر الشلالة'],
  65: ['عين وسارة', 'Ain Oussera'],
  66: ['مسعد'],
  67: ['قصر البخاري'],
  68: ['بوسعادة', 'Boussaada'],
  69: ['الأبيض سيدي الشيخ'],
}

/**
 * Forme de comparaison d’un nom de lieu : sans accent ni signe diacritique (y compris hamza et voyelles arabes),
 * lettres arabes équivalentes ramenées à une seule (ى→ي, ة→ه), ponctuation et tirets remplacés par une espace.
 * Pour une phrase en lettres latines, donne exactement les mots de `searchWords`.
 */
export function placeWords(s: string): string[] {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ـ/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(' ')
    .filter((w) => w.length > 1)
    .slice(0, 8)
}

/** Vrai si `a` et `b` diffèrent d’au plus une lettre (ajout, retrait ou remplacement). */
export function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0
  let j = 0
  let edits = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++
      j++
      continue
    }
    if (++edits > 1) return false
    if (a.length > b.length) i++
    else if (b.length > a.length) j++
    else {
      i++
      j++
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1
}

/** Mots d’au moins 5 lettres : une faute simple tolérée ; plus courts : égalité exacte. */
export const looseWordMatch = (typed: string, known: string) => typed === known || (typed.length >= 5 && known.length >= 5 && withinOneEdit(typed, known))
