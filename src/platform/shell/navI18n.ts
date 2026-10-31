import type { Lang } from '../i18n'
import { RUBRICS, type Rubric } from './nav'

type Text = { label: string; sheet?: string; hint: string; entries: [title: string, sub: string][]; feature: [title: string, kicker: string]; extra?: string }

/** Menu en anglais et en arabe : mêmes rubriques, mêmes liens, même ordre que le français. */
const T: Record<'en' | 'ar', Record<Rubric['key'], Text>> = {
  en: {
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
    services: {
      label: 'Services',
      hint: 'Doctors, tradespeople, home help',
      entries: [
        ['Health: book an appointment', 'Verified doctors and practitioners'],
        ['Home services', 'Cleaning, repairs, tutoring…'],
        ['Home & repairs', 'Tradespeople, maintenance'],
        ['Law & finance', 'Lawyers, accountants, banks'],
        ['Transport & mobility', 'Removals, taxis'],
        ['Full directory', 'All places and services'],
      ],
      feature: ['Providers verified by DALIL', 'Services'],
    },
    decouvrir: {
      label: 'Discover',
      hint: 'Sights, outings, weekends',
      entries: [
        ['Cities & wilayas', 'Discover each region and what makes it special'],
        ['Tourism', 'Must-see sights, nature, tours and activities'],
        ['Culture & history', 'Heritage, museums, historic sites'],
        ['Food', 'Restaurants, local specialities, regional produce'],
        ['What’s on', 'Festivals, exhibitions, cultural and sports events'],
        ['Nature & outdoors', 'Beaches, mountains, parks and natural areas'],
      ],
      feature: ['Places worth your time', ''],
    },
    demarches: {
      label: 'Paperwork',
      hint: 'Documents, government offices, consulates',
      entries: [
        ['Documents & papers', 'Documents, deadlines, costs'],
        ['Government offices', 'Official addresses and opening hours'],
        ['Start a business', 'Legal forms, registration, tax'],
        ['Moving from abroad', 'Customs, residence'],
        ['Embassies & consulates', 'Missions and appointments'],
        ['Emergencies & useful contacts', 'Essential numbers'],
      ],
      feature: ['All procedures', 'Paperwork'],
    },
    annonces: {
      label: 'Classifieds',
      hint: 'Property, jobs, vehicles, items',
      entries: [
        ['Property', 'Sell, rent, flat-share'],
        ['Jobs', 'Vacancies, applications, internships'],
        ['Vehicles', 'Cars, motorbikes, parts'],
        ['Items', 'Home, tech, fashion, kids'],
        ['Post an ad', 'Free, checked by DALIL'],
        ['My ads and messages', 'Track, renew, reply'],
      ],
      feature: ['All classifieds', 'Classifieds'],
    },
    vivre: {
      label: 'Living in Algeria',
      hint: 'Housing, school, banking, transport',
      entries: [
        ['Housing', 'Rent, buy, choose your neighbourhood'],
        ['School & family', 'Enrolment, nurseries, activities'],
        ['Transport', 'Getting around every day'],
        ['Budget & banking', 'Accounts, payments, currency'],
        ['Internet & phone', 'Plans, fibre, coverage'],
      ],
      feature: ['Your move, step by step', 'Living in Algeria'],
    },
    plus: {
      label: 'More',
      sheet: 'Guides & info',
      hint: 'Guides, news, criteria, contribute',
      entries: [
        ['News', 'What’s changing'],
        ['Guides', 'Understand and prepare'],
        ['Business & jobs', 'Invest, start up, work'],
        ['Verification criteria', 'Our quality standards'],
        ['Contribute', 'Share information'],
        ['Support packs', 'Move forward with a clear path'],
      ],
      feature: ['Places worth your time', 'Featured'],
      extra: 'Professional area',
    },
  },
  ar: {
    musulmane: {
      label: 'الحياة الإسلامية',
      hint: 'المساجد، الحج، التضامن',
      entries: [
        ['المساجد والمصليات', 'اعثر على مكان للصلاة'],
        ['التعليم القرآني', 'مدارس، معاهد، دروس'],
        ['الحج والعمرة', 'حضّر رحلتك، الوكالات'],
        ['المكتبات الإسلامية', 'كتب ومراجع'],
        ['التضامن والجمعيات', 'التكافل والجمعيات الخيرية'],
        ['الجنائز الإسلامية', 'خدمات الجنائز وغسل الموتى'],
      ],
      feature: ['دليل الحياة الإسلامية', 'الحياة الإسلامية'],
    },
    services: {
      label: 'الخدمات',
      hint: 'أطباء، حرفيون، مساعدة منزلية',
      entries: [
        ['الصحة: احجز موعدًا', 'أطباء وممارسون موثَّقون'],
        ['خدمات منزلية', 'تنظيف، أشغال صغيرة، دروس…'],
        ['المنزل والأشغال', 'حرفيون، صيانة'],
        ['القانون والمالية', 'محامون، محاسبون، بنوك'],
        ['النقل والتنقل', 'نقل الأثاث، سيارات الأجرة'],
        ['الدليل الكامل', 'كل الأماكن والخدمات'],
      ],
      feature: ['مقدّمو خدمات موثَّقون من دليل', 'الخدمات'],
    },
    decouvrir: {
      label: 'اكتشف',
      hint: 'معالم، نزهات، عطلة نهاية الأسبوع',
      entries: [
        ['المدن والولايات', 'اكتشف كل منطقة ومميزاتها'],
        ['السياحة', 'أبرز المعالم، الطبيعة، الجولات والأنشطة'],
        ['الثقافة والتاريخ', 'التراث، المتاحف، المواقع التاريخية'],
        ['فن الطبخ', 'مطاعم، أطباق محلية، منتجات الأرض'],
        ['المواعيد والفعاليات', 'مهرجانات، معارض، فعاليات ثقافية ورياضية'],
        ['الطبيعة والفضاءات', 'شواطئ، جبال، حدائق ومساحات طبيعية'],
      ],
      feature: ['أماكن تستحق وقتك', ''],
    },
    demarches: {
      label: 'الإجراءات',
      hint: 'الوثائق، الإدارات، القنصليات',
      entries: [
        ['الوثائق والأوراق', 'الملفات، الآجال، التكاليف'],
        ['الإدارات', 'العناوين والمواقيت الرسمية'],
        ['إنشاء مؤسسة', 'الأشكال القانونية، السجل، الضرائب'],
        ['الاستقرار من الخارج', 'الجمارك، الإقامة'],
        ['السفارات والقنصليات', 'التمثيليات والمواعيد'],
        ['الطوارئ وأرقام مفيدة', 'الأرقام الأساسية'],
      ],
      feature: ['كل الإجراءات', 'الإجراءات'],
    },
    annonces: {
      label: 'الإعلانات',
      hint: 'عقار، عمل، مركبات، أغراض',
      entries: [
        ['العقار', 'بيع، كراء، سكن مشترك'],
        ['العمل', 'عروض، طلبات، تربصات'],
        ['المركبات', 'سيارات، دراجات نارية، قطع غيار'],
        ['الأغراض', 'المنزل، التكنولوجيا، الأزياء، الأطفال'],
        ['انشر إعلانًا', 'مجانًا، يراجعه فريق دليل'],
        ['إعلاناتي ورسائلي', 'المتابعة، التجديد، الرد'],
      ],
      feature: ['كل الإعلانات', 'الإعلانات'],
    },
    vivre: {
      label: 'العيش في الجزائر',
      hint: 'السكن، المدرسة، البنك، النقل',
      entries: [
        ['السكن', 'الكراء، الشراء، اختيار الحي'],
        ['المدرسة والعائلة', 'التسجيل، دور الحضانة، الأنشطة'],
        ['النقل', 'التنقل اليومي'],
        ['الميزانية والبنك', 'الحسابات، الدفع، العملات'],
        ['الإنترنت والهاتف', 'العروض، الألياف البصرية، التغطية'],
      ],
      feature: ['استقرارك خطوة بخطوة', 'العيش في الجزائر'],
    },
    plus: {
      label: 'المزيد',
      sheet: 'أدلة ومعلومات',
      hint: 'أدلة، أخبار، معايير، مساهمة',
      entries: [
        ['الأخبار', 'ما الذي يتغير'],
        ['الأدلة', 'افهم واستعد'],
        ['الأعمال والتوظيف', 'استثمر، أنشئ، اعمل'],
        ['معايير التحقق', 'مستوى الجودة الذي نلتزم به'],
        ['ساهم', 'شارك معلومة'],
        ['باقات المرافقة', 'تقدّم بمسار واضح'],
      ],
      feature: ['أماكن تستحق وقتك', 'مختارات'],
      extra: 'الفضاء المهني',
    },
  },
}

const FR_SHEET: Partial<Record<Rubric['key'], { sheet?: string; hint: string }>> = {
  musulmane: { hint: 'Mosquées, Hajj, entraide' },
  services: { hint: 'Médecins, artisans, aide à domicile' },
  decouvrir: { hint: 'Sites, sorties, week-end' },
  demarches: { hint: 'Papiers, administrations, consulats' },
  annonces: { hint: 'Immobilier, emploi, véhicules, objets' },
  vivre: { hint: 'Logement, école, banque, transports' },
  plus: { sheet: 'Guides & infos', hint: 'Guides, actualités, critères, contribuer' },
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
