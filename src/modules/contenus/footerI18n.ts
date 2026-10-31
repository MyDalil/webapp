import type { Lang } from '@/platform/i18n'
import { SHELL } from './content'

/** Pied de page en anglais et en arabe : même structure, mêmes liens, textes traduits. */
const T: Record<string, [en: string, ar: string]> = {
  'Guide & Installation Algérie': ['Algeria Guide & Moving', 'دليل الجزائر والاستقرار'],
  'DALIL · ALGÉRIE EN CONFIANCE': ['DALIL · ALGERIA WITH CONFIDENCE', 'دليل · الجزائر بثقة'],
  'Plateforme indépendante d’information, de confiance et d’accompagnement à l’installation en Algérie.': [
    'Independent platform for information, trust and support for settling in Algeria.',
    'منصة مستقلة للمعلومات والثقة والمرافقة في الاستقرار بالجزائر.',
  ],
  Explorer: ['Explore', 'استكشف'],
  'Explorer l’Algérie': ['Explore Algeria', 'استكشف الجزائر'],
  'S’installer & Vivre': ['Settle & Live', 'الاستقرار والعيش'],
  'Démarches & Papiers': ['Procedures & Papers', 'الإجراءات والوثائق'],
  Actualités: ['News', 'الأخبار'],
  Services: ['Services', 'الخدمات'],
  'Annuaire & Adresses': ['Directory & Addresses', 'الدليل والعناوين'],
  'Business & Emploi': ['Business & Jobs', 'الأعمال والتوظيف'],
  'Packs d’accompagnement': ['Support packs', 'باقات المرافقة'],
  'Créer mon parcours': ['Create my plan', 'أنشئ مساري'],
  Confiance: ['Trust', 'الثقة'],
  'Critères de vérification': ['Verification criteria', 'معايير التحقق'],
  'Proposer une adresse': ['Suggest an address', 'اقترح عنوانًا'],
  'Espace professionnel': ['Professional area', 'الفضاء المهني'],
  Conditions: ['Terms', 'الشروط'],
  'Légal & données': ['Legal & data', 'القانون والبيانات'],
  Confidentialité: ['Privacy', 'الخصوصية'],
  Cookies: ['Cookies', 'ملفات تعريف الارتباط'],
  'Conditions d’utilisation': ['Terms of use', 'شروط الاستخدام'],
  'Mentions légales': ['Legal notice', 'الإشعار القانوني'],
  'Charte professionnels': ['Professionals’ charter', 'ميثاق المهنيين'],
  'Crédits photos': ['Photo credits', 'حقوق الصور'],
  'Donner mon avis': ['Give feedback', 'أبدِ رأيك'],
  '© 2026 DALIL — éditeur, adresse, immatriculation et contact DPO à compléter avant ouverture publique.': [
    '© 2026 DALIL — publisher, address, registration and DPO contact to be completed before public launch.',
    '© 2026 دليل — الناشر والعنوان والتسجيل وجهة الاتصال بمسؤول حماية البيانات تُستكمل قبل الإطلاق العام.',
  ],
  'Loi algérienne 18-07 modifiée par la loi 25-11 · FR / EN / AR': [
    'Algerian Law 18-07 as amended by Law 25-11 · FR / EN / AR',
    'القانون الجزائري 18-07 المعدّل بالقانون 25-11 · FR / EN / AR',
  ],
}

function translate(n: unknown, i: 0 | 1): unknown {
  if (typeof n === 'string') return T[n.trim()]?.[i] ?? n
  if (Array.isArray(n)) return n.map((x) => translate(x, i))
  if (n && typeof n === 'object') {
    const o: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(n)) o[k] = k === 'href' ? (v === '/' ? (i === 0 ? '/en' : '/ar') : v) : k === 'aria-label' && v === 'DALIL, accueil' ? (i === 0 ? 'DALIL, home' : 'دليل، الصفحة الرئيسية') : translate(v, i)
    return o
  }
  return n
}

export function footerFor(l: Lang): typeof SHELL.footer {
  return l === 'fr' ? SHELL.footer : (translate(SHELL.footer, l === 'en' ? 0 : 1) as typeof SHELL.footer)
}
