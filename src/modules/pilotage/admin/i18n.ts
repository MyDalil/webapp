/** Textes du cockpit en FR, AR, EN. Le français est la source ; une clé absente retombe sur le français. */
export type Lang = 'fr' | 'ar' | 'en'
export const asLang = (l: unknown): Lang => (l === 'ar' || l === 'en' ? l : 'fr')

const AR: Record<string, string> = {
  'group.pilotage': 'القيادة', 'group.agents': 'الوكلاء', 'group.contenu': 'المحتوى', 'group.communaute': 'المجتمع',
  'group.communication': 'التواصل', 'group.business': 'الأعمال', 'group.systeme': 'النظام', 'group.autres': 'بيانات أخرى',
  'nav.overview': 'نظرة عامة', 'nav.activite': 'سجل النشاط', 'nav.salle': 'غرفة التحكم', 'nav.taches': 'المهام', 'nav.validation': 'المصادقة',
  'nav.conversations': 'المحادثات', 'nav.memoire': 'الذاكرة والمهارات', 'nav.connecteurs': 'الموصلات', 'nav.fiches': 'الأماكن والبطاقات',
  'nav.evenements': 'الفعاليات', 'nav.praticiens': 'ممارسو الصحة', 'nav.prestataires': 'مقدمو الخدمات', 'nav.demarches': 'الإجراءات',
  'nav.plateformes': 'المنصات الرسمية', 'nav.representations': 'القنصليات والسفارات', 'nav.medias': 'مكتبة الوسائط', 'nav.editeur': 'محرر الموقع',
  'nav.une': 'في الواجهة', 'nav.couverture': 'التغطية', 'nav.traductions': 'الترجمات', 'nav.vie-musulmane': 'الحياة الإسلامية',
  'nav.moderation': 'الإشراف', 'nav.contributions': 'المساهمات', 'nav.photos': 'الصور المقترحة', 'nav.avis': 'التقييمات', 'nav.annonces': 'الإعلانات',
  'nav.pros': 'وثائق المهنيين', 'nav.membres': 'الأعضاء', 'nav.accompagnement': 'المرافقة', 'nav.packs': 'الباقات', 'nav.rdv': 'المواعيد',
  'nav.missions': 'المهمات', 'nav.boite': 'البريد الموحد', 'nav.newsletter': 'النشرة', 'nav.abonnes': 'المشتركون', 'nav.telegram': 'تيليغرام',
  'nav.emails': 'الرسائل المرسلة', 'nav.msg-annonces': 'رسائل الإعلانات', 'nav.msg-missions': 'رسائل المهمات', 'nav.finances': 'المالية',
  'nav.analytics': 'التحليلات', 'nav.seo': 'تحسين الظهور', 'nav.ia': 'الذكاء الاصطناعي والتكاليف', 'nav.securite': 'الأمان',
  'nav.sante': 'الحالة التقنية', 'nav.planifiees': 'المهام المجدولة', 'nav.audit': 'سجل التدقيق', 'nav.equipe': 'الفريق',
  'nav.commandes': 'الأوامر والإيقاف العام', 'nav.reglages-acc': 'إعدادات المرافقة',
  'ui.team': 'لوحة الإدارة', 'ui.locked': 'سعيد فقط — لا وكلاء', 'ui.killswitch': 'الإيقاف العام', 'ui.ks.off': 'غير مفعّل', 'ui.ks.on': 'مفعّل',
  'ui.ks.manage': 'إدارة الإيقاف العام', 'ui.logout': 'تسجيل الخروج', 'ui.search': 'ابحث أو انتقل إلى…', 'ui.cmd.placeholder': 'ابحث في الإدارة والبطاقات والإعلانات…',
  'ui.cmd.pages': 'الصفحات', 'ui.cmd.results': 'النتائج', 'ui.cmd.none': 'لا توجد نتائج.', 'ui.theme': 'الوضع الفاتح أو الداكن', 'ui.lang': 'لغة الإدارة',
  'ui.menu': 'فتح القائمة', 'ui.close': 'إغلاق',
  'pv.hello': 'مرحبًا', 'pv.sub': 'إليك ما يحتاج إلى انتباهك.', 'pv.kpis': 'المؤشرات الرئيسية', 'pv.agents': 'الوكلاء', 'pv.agents.sub': 'الحالة الحالية لكل وكيل.',
  'pv.agents.none': 'لا يوجد وكيل مسجل بعد.', 'pv.review': 'بانتظار المصادقة', 'pv.review.sub': 'أعمال الوكلاء التي تنتظر قرارك.', 'pv.review.none': 'لا شيء بانتظار المصادقة.',
  'pv.contrib': 'مساهمات جديدة', 'pv.contrib.sub': 'اقتراحات الزوار التي يجب معالجتها.', 'pv.contrib.none': 'لا توجد مساهمة جديدة.', 'pv.all': 'عرض الكل',
  'pv.feed': 'سجل النشاط', 'pv.feed.sub': 'قبل كل إجراء للوكلاء وأثناءه وبعده، مع معرّفه.', 'pv.feed.none': 'لا يوجد نشاط للوكلاء بعد.',
  'phase.before': 'قبل', 'phase.during': 'أثناء', 'phase.after': 'بعد', 'phase.order': 'أمر',
  'pv.status.active': 'نشط', 'pv.status.paused': 'متوقف مؤقتًا', 'pv.status.disabled': 'معطل',
  'kpi.visiteurs': 'الزوار خلال 24 ساعة', 'kpi.contributions': 'مساهمات للمعالجة', 'kpi.validation': 'أعمال وكلاء للمصادقة', 'kpi.annonces': 'إعلانات للمراجعة',
  'kpi.fiches': 'بطاقات منشورة', 'kpi.aVerifier': 'بطاقات للتحقق (الفريق)', 'kpi.coutIa': 'تكلفة الذكاء الاصطناعي هذا الشهر', 'kpi.erreurs': 'أخطاء غير محلولة',
}

const EN: Record<string, string> = {
  'group.pilotage': 'Overview', 'group.agents': 'Agents', 'group.contenu': 'Content', 'group.communaute': 'Community', 'group.communication': 'Communication',
  'group.business': 'Business', 'group.systeme': 'System', 'group.autres': 'Other data',
  'nav.overview': 'Dashboard', 'nav.activite': 'Activity feed', 'nav.salle': 'Control room', 'nav.taches': 'Tasks', 'nav.validation': 'Approvals',
  'nav.conversations': 'Conversations', 'nav.memoire': 'Memory and skills', 'nav.connecteurs': 'Connectors', 'nav.fiches': 'Places and listings',
  'nav.evenements': 'Events', 'nav.praticiens': 'Health practitioners', 'nav.prestataires': 'Service providers', 'nav.demarches': 'Procedures',
  'nav.plateformes': 'Official platforms', 'nav.representations': 'Consulates and embassies', 'nav.medias': 'Media library', 'nav.editeur': 'Site editor',
  'nav.une': 'Featured', 'nav.couverture': 'Coverage', 'nav.traductions': 'Translations', 'nav.vie-musulmane': 'Muslim life',
  'nav.moderation': 'Moderation', 'nav.contributions': 'Contributions', 'nav.photos': 'Proposed photos', 'nav.avis': 'Reviews', 'nav.annonces': 'Classifieds',
  'nav.pros': 'Pro documents', 'nav.membres': 'Members', 'nav.accompagnement': 'Assistance', 'nav.packs': 'Packs', 'nav.rdv': 'Appointments',
  'nav.missions': 'Missions', 'nav.boite': 'Unified inbox', 'nav.newsletter': 'Newsletter', 'nav.abonnes': 'Subscribers', 'nav.telegram': 'Telegram',
  'nav.emails': 'Sent emails', 'nav.msg-annonces': 'Classified messages', 'nav.msg-missions': 'Mission messages', 'nav.finances': 'Finance',
  'nav.analytics': 'Analytics', 'nav.seo': 'SEO', 'nav.ia': 'AI and costs', 'nav.securite': 'Security', 'nav.sante': 'Technical health',
  'nav.planifiees': 'Scheduled jobs', 'nav.audit': 'Audit log', 'nav.equipe': 'Team', 'nav.commandes': 'Controls and kill switch',
  'nav.reglages-acc': 'Assistance settings',
  'ui.team': 'Admin', 'ui.locked': 'Saïd only — no agents', 'ui.killswitch': 'Kill switch', 'ui.ks.off': 'Off', 'ui.ks.on': 'On',
  'ui.ks.manage': 'Manage the kill switch', 'ui.logout': 'Log out', 'ui.search': 'Search or jump to…', 'ui.cmd.placeholder': 'Search the admin, listings, classifieds…',
  'ui.cmd.pages': 'Pages', 'ui.cmd.results': 'Results', 'ui.cmd.none': 'No results.', 'ui.theme': 'Light or dark mode', 'ui.lang': 'Admin language',
  'ui.menu': 'Open the menu', 'ui.close': 'Close',
  'pv.hello': 'Hello', 'pv.sub': 'Here is what needs your attention.', 'pv.kpis': 'Key indicators', 'pv.agents': 'Agents', 'pv.agents.sub': 'Current state of each agent.',
  'pv.agents.none': 'No agent registered yet.', 'pv.review': 'Awaiting approval', 'pv.review.sub': 'Agent work waiting for your decision.', 'pv.review.none': 'Nothing awaits approval.',
  'pv.contrib': 'New contributions', 'pv.contrib.sub': 'Visitor suggestions to process.', 'pv.contrib.none': 'No new contribution.', 'pv.all': 'See all',
  'pv.feed': 'Activity feed', 'pv.feed.sub': 'Before, during and after each agent action, with its ID.', 'pv.feed.none': 'No agent activity yet.',
  'phase.before': 'Before', 'phase.during': 'During', 'phase.after': 'After', 'phase.order': 'Order',
  'pv.status.active': 'Active', 'pv.status.paused': 'Paused', 'pv.status.disabled': 'Disabled',
  'kpi.visiteurs': 'Visitors in 24 h', 'kpi.contributions': 'Contributions to process', 'kpi.validation': 'Agent work to approve', 'kpi.annonces': 'Classifieds to review',
  'kpi.fiches': 'Published listings', 'kpi.aVerifier': 'Listings to verify (team)', 'kpi.coutIa': 'AI cost this month', 'kpi.erreurs': 'Unresolved errors',
}

const FR: Record<string, string> = {
  'group.autres': 'Autres données',
  'ui.team': 'Admin · équipe', 'ui.locked': 'Saïd seul — aucun agent', 'ui.killswitch': 'Arrêt général', 'ui.ks.off': 'Désactivé', 'ui.ks.on': 'Activé',
  'ui.ks.manage': 'Gérer l’arrêt général', 'ui.logout': 'Se déconnecter', 'ui.search': 'Chercher ou aller à…', 'ui.cmd.placeholder': 'Chercher dans l’admin, les fiches, les annonces…',
  'ui.cmd.pages': 'Pages', 'ui.cmd.results': 'Résultats', 'ui.cmd.none': 'Aucun résultat.', 'ui.theme': 'Mode clair ou sombre', 'ui.lang': 'Langue de l’admin',
  'ui.menu': 'Ouvrir le menu', 'ui.close': 'Fermer',
  'pv.hello': 'Bonjour', 'pv.sub': 'Voici ce qui demande votre attention.', 'pv.kpis': 'Indicateurs clés', 'pv.agents': 'Agents', 'pv.agents.sub': 'L’état actuel de chaque agent.',
  'pv.agents.none': 'Aucun agent enregistré pour l’instant.', 'pv.review': 'À valider', 'pv.review.sub': 'Le travail des agents qui attend votre décision.', 'pv.review.none': 'Rien n’attend de validation.',
  'pv.contrib': 'Nouvelles contributions', 'pv.contrib.sub': 'Les propositions des visiteurs à traiter.', 'pv.contrib.none': 'Aucune nouvelle contribution.', 'pv.all': 'Tout voir',
  'pv.status.active': 'Actif', 'pv.status.paused': 'En pause', 'pv.status.disabled': 'Désactivé',
  'pv.feed': 'Fil d’activité', 'pv.feed.sub': 'Avant, pendant et après chaque action d’agent, avec son identifiant.', 'pv.feed.none': 'Aucune activité d’agent pour l’instant.',
  'phase.before': 'Avant', 'phase.during': 'Pendant', 'phase.after': 'Après', 'phase.order': 'Ordre',
}

const DICT: Record<Lang, Record<string, string>> = { fr: FR, ar: AR, en: EN }

/** `t(lang)(clé, texteFrançais)` : le texte français sert de valeur par défaut. */
export const t = (lang: Lang) => (key: string, fr?: string) => DICT[lang][key] ?? FR[key] ?? fr ?? key
