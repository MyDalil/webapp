import type { Lang } from '@/platform/i18n'
import { SHELL } from './content'

/** Pied de page en anglais et en arabe : même structure, mêmes liens, textes traduits. */
const T: Record<string, [en: string, ar: string]> = {
  'Le guide pratique de l’Algérie. Adresses, santé, services, annonces et démarches, dans tout le pays.': [
    'The practical guide to Algeria. Places, health, services, ads and procedures, across the country.',
    'الدليل العملي للجزائر. عناوين، صحة، خدمات، إعلانات وإجراءات، في كامل البلاد.',
  ],
  Rubriques: ['Sections', 'الأقسام'],
  Santé: ['Health', 'الصحة'],
  Services: ['Services', 'الخدمات'],
  Annonces: ['Ads', 'الإعلانات'],
  'Vie musulmane': ['Muslim life', 'الحياة الإسلامية'],
  Découvrir: ['Discover', 'اكتشف'],
  'Vie pratique': ['Everyday life', 'الحياة اليومية'],
  Professionnels: ['Professionals', 'المهنيون'],
  'Espace professionnel': ['Professional area', 'الفضاء المهني'],
  'Inscrire mon activité': ['List my business', 'سجّل نشاطي'],
  'Proposer une adresse': ['Suggest a place', 'اقترح عنوانًا'],
  Confiance: ['Trust', 'الثقة'],
  'Comment nous vérifions': ['How we verify', 'كيف نتحقق'],
  'Sécurité et arnaques': ['Security and scams', 'الأمان والاحتيال'],
  'Donner mon avis': ['Give feedback', 'أبدِ رأيك'],
  'Nous écrire': ['Contact us', 'راسلنا'],
  'Informations légales': ['Legal information', 'معلومات قانونية'],
  'Mentions légales': ['Legal notice', 'الإشعار القانوني'],
  'Conditions d’utilisation': ['Terms of use', 'شروط الاستخدام'],
  Confidentialité: ['Privacy', 'الخصوصية'],
  Cookies: ['Cookies', 'ملفات تعريف الارتباط'],
  'Charte des professionnels': ['Professionals’ charter', 'ميثاق المهنيين'],
  'Crédits photos': ['Photo credits', 'حقوق الصور'],
  '© 2026 DALIL · Données protégées selon la loi 18-07 modifiée par la loi 25-11': [
    '© 2026 DALIL · Data protected under Law 18-07 as amended by Law 25-11',
    '© 2026 دليل · بيانات محمية وفق القانون 18-07 المعدّل بالقانون 25-11',
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
