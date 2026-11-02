import type { Lang } from '../i18n'
import { RUBRICS, type Rubric } from './nav'

type Text = { label: string; sheet?: string; hint: string; entries: [title: string, sub: string][]; feature: [title: string, kicker: string]; extra?: string }

/** Menu en anglais et en arabe : mêmes rubriques, mêmes liens, même ordre que le français. */
const T: Record<'en' | 'ar', Record<Rubric['key'], Text>> = {
  en: {
    sante: {
      label: 'Health',
      hint: 'Doctors, pharmacies, emergencies',
      entries: [
        ['Doctors & practitioners', 'Contact details, booking if offered'],
        ['Pharmacies', 'Find a pharmacy nearby'],
        ['Laboratories', 'Medical tests'],
        ['Clinics & hospitals', 'Care facilities'],
        ['Vets', 'Veterinary practices and clinics'],
        ['Emergencies', 'Emergency numbers'],
      ],
      feature: ['Find a health professional', 'Health'],
    },
    services: {
      label: 'Services',
      hint: 'Repairs, cleaning, home help',
      entries: [
        ['Repairs & maintenance', 'DIY, repairs, tradespeople'],
        ['Cleaning & upkeep', 'Cleaning, ironing, gardening'],
        ['Removals', 'Transport, furniture assembly'],
        ['Family & home help', 'Childcare, elderly care, pets'],
        ['Lessons & IT', 'Private lessons, IT support'],
        ['Law & advice', 'Lawyers, notaries, accountants'],
      ],
      feature: ['Describe what you need', 'Services'],
    },
    annonces: {
      label: 'Classifieds',
      hint: 'Property, jobs, vehicles, items',
      entries: [
        ['Property', 'Sell, rent, flatshare'],
        ['Jobs', 'Offers, applications, internships'],
        ['Vehicles', 'Cars, motorbikes, parts'],
        ['Items', 'Home, tech, fashion, kids'],
        ['Post an ad', 'Free, checked by DALIL'],
        ['My ads and messages', 'Track, renew, reply'],
      ],
      feature: ['All classifieds', 'Classifieds'],
    },
    musulmane: {
      label: 'Muslim life',
      hint: 'Mosques, Hajj, mutual aid',
      entries: [
        ['Mosques & prayer rooms', 'Find a place to pray'],
        ['Quranic education', 'Schools, institutes, classes'],
        ['Hajj & Umrah', 'Plan your trip, agencies'],
        ['Islamic bookshops', 'Books and resources'],
        ['Mutual aid & charities', 'Solidarity, charitable associations'],
        ['Muslim funerals', 'Funeral services, ritual washing'],
      ],
      feature: ['The guide to Muslim life', 'Muslim life'],
    },
    decouvrir: {
      label: 'Discover',
      hint: 'Places, outings, weekend',
      entries: [
        ['Cities & regions', 'Each region, its strengths and character'],
        ['Heritage & museums', 'Historic sites, museums, ancient cities'],
        ['Nature & beaches', 'Beaches, mountains, parks, oases'],
        ['Restaurants & cafés', 'Restaurants, cafés, local specialities'],
        ['Stays', 'Hotels, guesthouses'],
        ['What’s on & weekend', 'Outings, festivals, dated events'],
      ],
      feature: ['What to do this weekend?', 'Discover'],
      extra: 'All guides',
    },
    vivre: {
      label: 'Living & paperwork',
      hint: 'Moving, paperwork, housing, school',
      entries: [
        ['Moving to Algeria', 'Prepare your arrival'],
        ['Papers & consulates', 'Official procedures, administrations, consulates'],
        ['Housing & neighbourhood', 'Rent, buy, choose your area'],
        ['School & family', 'Enrolment, nurseries, activities'],
        ['Work & business', 'Jobs, legal status, registry, tax'],
        ['Banking, telecoms & transport', 'Accounts, plans, getting around'],
      ],
      feature: ['All procedures', 'Living & paperwork'],
    },
  },
  ar: {
    sante: {
      label: 'الصحة',
      hint: 'أطباء، صيدليات، طوارئ',
      entries: [
        ['الأطباء والممارسون', 'معلومات الاتصال، وموعد إن كان متاحًا'],
        ['الصيدليات', 'ابحث عن صيدلية قريبة'],
        ['المخابر', 'التحاليل الطبية'],
        ['العيادات والمستشفيات', 'مؤسسات العلاج'],
        ['البياطرة', 'عيادات بيطرية'],
        ['الطوارئ', 'أرقام الطوارئ'],
      ],
      feature: ['اعثر على مهني صحة', 'الصحة'],
    },
    services: {
      label: 'الخدمات',
      hint: 'أشغال، تنظيف، مساعدة منزلية',
      entries: [
        ['أشغال وإصلاحات', 'ترميم، إصلاحات، حرفيون'],
        ['تنظيف وصيانة', 'تنظيف، كيّ، بستنة'],
        ['نقل الأثاث', 'نقل، تركيب الأثاث'],
        ['العائلة والمساعدة المنزلية', 'رعاية الأطفال، المسنّون، الحيوانات'],
        ['دروس وإعلام آلي', 'دروس خصوصية، إصلاح الحواسيب'],
        ['القانون والاستشارة', 'محامون، موثقون، محاسبون'],
      ],
      feature: ['صف حاجتك', 'الخدمات'],
    },
    annonces: {
      label: 'الإعلانات',
      hint: 'عقارات، توظيف، مركبات، أغراض',
      entries: [
        ['العقارات', 'بيع، كراء، سكن مشترك'],
        ['التوظيف', 'عروض، ترشيحات، تربصات'],
        ['المركبات', 'سيارات، دراجات نارية، قطع غيار'],
        ['الأغراض', 'المنزل، التقنية، الملابس، الأطفال'],
        ['انشر إعلانًا', 'مجاني، يراجعه دليل'],
        ['إعلاناتي ورسائلي', 'متابعة، تجديد، رد'],
      ],
      feature: ['كل الإعلانات', 'الإعلانات'],
    },
    musulmane: {
      label: 'الحياة الإسلامية',
      hint: 'مساجد، حج، تكافل',
      entries: [
        ['المساجد والمصليات', 'ابحث عن مكان للصلاة'],
        ['التعليم القرآني', 'مدارس، معاهد، دروس'],
        ['الحج والعمرة', 'حضّر مشروعك، الوكالات'],
        ['المكتبات الإسلامية', 'كتب وموارد'],
        ['التكافل والجمعيات', 'التضامن، الجمعيات الخيرية'],
        ['الجنائز', 'مصالح الجنائز، غسل الميت'],
      ],
      feature: ['دليل الحياة الإسلامية', 'الحياة الإسلامية'],
    },
    decouvrir: {
      label: 'اكتشف',
      hint: 'مواقع، خرجات، عطلة نهاية الأسبوع',
      entries: [
        ['المدن والمناطق', 'كل منطقة، مزاياها وخصائصها'],
        ['التراث والمتاحف', 'مواقع تاريخية، متاحف، مدن أثرية'],
        ['الطبيعة والشواطئ', 'شواطئ، جبال، حدائق، واحات'],
        ['المطاعم والمقاهي', 'مطاعم، مقاهٍ، أطباق محلية'],
        ['الإقامات', 'فنادق، بيوت ضيافة'],
        ['المواعيد ونهاية الأسبوع', 'خرجات، مهرجانات، فعاليات مؤرخة'],
      ],
      feature: ['ماذا تفعل في نهاية الأسبوع؟', 'اكتشف'],
      extra: 'كل الأدلة',
    },
    vivre: {
      label: 'العيش والإجراءات',
      hint: 'الاستقرار، الوثائق، السكن، المدرسة',
      entries: [
        ['الاستقرار في الجزائر', 'حضّر وصولك'],
        ['الوثائق والقنصليات', 'إجراءات رسمية، إدارات، قنصليات'],
        ['السكن والحي', 'كراء، شراء، اختيار الحي'],
        ['المدرسة والعائلة', 'تسجيلات، حضانات، أنشطة'],
        ['العمل والمؤسسة', 'توظيف، الوضع القانوني، السجل، الضرائب'],
        ['البنك والاتصالات والنقل', 'حسابات، اشتراكات، التنقل'],
      ],
      feature: ['كل الإجراءات', 'العيش والإجراءات'],
    },
  },
}

const FR_SHEET: Partial<Record<Rubric['key'], { sheet?: string; hint: string }>> = {
  sante: { hint: 'Médecins, pharmacies, urgences' },
  services: { hint: 'Travaux, ménage, aide à domicile' },
  annonces: { hint: 'Immobilier, emploi, véhicules, objets' },
  musulmane: { hint: 'Mosquées, Hajj, entraide' },
  decouvrir: { hint: 'Sites, sorties, week-end' },
  vivre: { hint: 'Installation, papiers, logement, école' },
}

export type LocalRubric = Rubric & { sheet: string; hint: string }

/** Rubriques dans la langue de la page (liens inchangés). */
export function rubricsFor(l: Lang): LocalRubric[] {
  return RUBRICS.map((r) => {
    if (l === 'fr') {
      const f = FR_SHEET[r.key]
      return { ...r, sheet: f?.sheet ?? r.label, hint: f?.hint ?? '' }
    }
    const t = T[l][r.key]
    return {
      ...r,
      label: t.label,
      sheet: t.sheet ?? t.label,
      hint: t.hint,
      entries: r.entries.map((e, i) => [e[0], e[1], t.entries[i]?.[0] ?? e[2], t.entries[i]?.[1] ?? e[3]]),
      feature: { ...r.feature, title: t.feature[0], kicker: t.feature[1] },
      extra: r.extra && t.extra ? [r.extra[0], t.extra] : r.extra,
    }
  })
}
