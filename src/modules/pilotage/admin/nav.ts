/**
 * Menu du cockpit /admin. Logique pure : le composant ne fait qu’afficher.
 * Une entrée a une ou plusieurs cibles ; la première disponible gagne
 * (un écran du cockpit livré remplace la liste Payload de repli).
 */
export type IconName =
  | 'grid' | 'activity' | 'bot' | 'tasks' | 'check' | 'chat' | 'book' | 'plug' | 'file' | 'calendar' | 'heart' | 'tool' | 'flag'
  | 'globe' | 'image' | 'layout' | 'star' | 'map' | 'mosque' | 'shield' | 'inbox' | 'tag' | 'brief' | 'users' | 'mail' | 'send'
  | 'wallet' | 'chart' | 'search' | 'cpu' | 'lock' | 'pulse' | 'clock' | 'list' | 'sliders' | 'power' | 'database'

export type BadgeKey = 'validation' | 'taches' | 'moderation' | 'pros' | 'inbox' | 'contributions' | 'annonces'

type Target = { kind: 'collection'; slug: string; query?: string } | { kind: 'global'; slug: string } | { kind: 'view'; path: string }
type ItemDef = { key: string; label: string; icon: IconName; targets: Target[]; badge?: BadgeKey; lockedForAgents?: true }
type GroupDef = { key: string; label: string; items: ItemDef[] }

export type NavItem = { key: string; label: string; icon: IconName; href: string; badge?: BadgeKey; lockedForAgents?: true }
export type NavGroup = { key: string; label: string; items: NavItem[] }
export type Visible = { collections: readonly string[]; globals: readonly string[] }
export type Role = 'patron' | 'admin' | 'editor' | 'conseiller'

/** Rôles au périmètre restreint : seules ces entrées du menu (règle de src/platform/access.ts). */
const ROLE_SCOPE: Partial<Record<Role, readonly string[]>> = { conseiller: ['accompagnement'] }

const col = (slug: string, query?: string): Target => ({ kind: 'collection', slug, query })
const glo = (slug: string): Target => ({ kind: 'global', slug })
const view = (path: string): Target => ({ kind: 'view', path })
const REVIEW = 'where%5Bstatus%5D%5Bequals%5D=review'

export const NAV_GROUPS: GroupDef[] = [
  { key: 'pilotage', label: 'Pilotage', items: [
    { key: 'overview', label: 'Vue d’ensemble', icon: 'grid', targets: [view('')] },
    { key: 'activite', label: 'Fil d’activité', icon: 'activity', targets: [view('/cockpit/activite'), col('agent-notifications')] },
  ] },
  { key: 'agents', label: 'Agents', items: [
    { key: 'salle', label: 'Salle de contrôle', icon: 'bot', targets: [view('/cockpit/agents'), col('agents')] },
    { key: 'taches', label: 'Tâches', icon: 'tasks', targets: [view('/cockpit/taches'), col('agent-tasks')], badge: 'taches' },
    { key: 'validation', label: 'Validation', icon: 'check', targets: [view('/cockpit/validation'), col('agent-tasks', REVIEW)], badge: 'validation' },
    { key: 'conversations', label: 'Conversations', icon: 'chat', targets: [view('/cockpit/conversations'), col('agent-messages')] },
    { key: 'memoire', label: 'Mémoire et skills', icon: 'book', targets: [view('/cockpit/memoire')] },
    { key: 'connecteurs', label: 'Connecteurs', icon: 'plug', targets: [view('/cockpit/connecteurs')] },
  ] },
  { key: 'contenu', label: 'Contenu', items: [
    { key: 'fiches', label: 'Lieux et fiches', icon: 'file', targets: [col('places')] },
    { key: 'evenements', label: 'Événements', icon: 'calendar', targets: [col('events')] },
    { key: 'praticiens', label: 'Praticiens de santé', icon: 'heart', targets: [col('practitioners')] },
    { key: 'prestataires', label: 'Prestataires', icon: 'tool', targets: [col('providers')] },
    { key: 'demarches', label: 'Démarches', icon: 'flag', targets: [col('procedures')] },
    { key: 'plateformes', label: 'Plateformes officielles', icon: 'globe', targets: [col('platforms')] },
    { key: 'representations', label: 'Consulats et ambassades', icon: 'globe', targets: [col('representations')] },
    { key: 'medias', label: 'Médiathèque', icon: 'image', targets: [view('/cockpit/medias'), col('media')] },
    { key: 'editeur', label: 'Éditeur du site', icon: 'layout', targets: [view('/cockpit/editeur')] },
    { key: 'une', label: 'À la une', icon: 'star', targets: [glo('featured-destination')] },
    { key: 'couverture', label: 'Couverture', icon: 'map', targets: [view('/cockpit/couverture')] },
    { key: 'traductions', label: 'Traductions', icon: 'globe', targets: [view('/cockpit/traductions')] },
    { key: 'vie-musulmane', label: 'Vie musulmane', icon: 'mosque', targets: [view('/cockpit/vie-musulmane')], lockedForAgents: true },
  ] },
  { key: 'communaute', label: 'Communauté', items: [
    { key: 'moderation', label: 'Modération', icon: 'shield', targets: [view('/cockpit/moderation')], badge: 'moderation' },
    { key: 'contributions', label: 'Contributions', icon: 'inbox', targets: [col('submissions')], badge: 'contributions' },
    { key: 'photos', label: 'Photos proposées', icon: 'image', targets: [col('contribution-photos')] },
    { key: 'avis', label: 'Avis', icon: 'star', targets: [col('provider-reviews')] },
    { key: 'annonces', label: 'Annonces', icon: 'tag', targets: [view('/cockpit/annonces'), col('classifieds')], badge: 'annonces' },
    { key: 'pros', label: 'Pièces des pros', icon: 'brief', targets: [view('/cockpit/pros'), col('provider-documents')], badge: 'pros' },
    { key: 'membres', label: 'Membres', icon: 'users', targets: [view('/cockpit/membres'), col('members')] },
    { key: 'accompagnement', label: 'Accompagnement', icon: 'chat', targets: [col('demandes-accompagnement')] },
    { key: 'packs', label: 'Packs', icon: 'brief', targets: [col('packs')] },
    { key: 'rdv', label: 'Rendez-vous', icon: 'calendar', targets: [col('appointments')] },
    { key: 'missions', label: 'Missions', icon: 'tool', targets: [col('missions')] },
  ] },
  { key: 'communication', label: 'Communication', items: [
    { key: 'boite', label: 'Boîte unique', icon: 'inbox', targets: [view('/cockpit/boite')], badge: 'inbox' },
    { key: 'newsletter', label: 'Newsletter', icon: 'mail', targets: [view('/cockpit/newsletter'), col('campaigns')] },
    { key: 'abonnes', label: 'Abonnés', icon: 'users', targets: [col('subscribers')] },
    { key: 'telegram', label: 'Telegram', icon: 'send', targets: [view('/cockpit/telegram'), col('telegram-posts')] },
    { key: 'emails', label: 'Emails envoyés', icon: 'mail', targets: [col('email-deliveries')] },
    { key: 'msg-annonces', label: 'Messages des annonces', icon: 'chat', targets: [col('classified-messages')] },
    { key: 'msg-missions', label: 'Messages des missions', icon: 'chat', targets: [col('mission-messages')] },
  ] },
  { key: 'business', label: 'Business', items: [
    { key: 'finances', label: 'Finances', icon: 'wallet', targets: [view('/cockpit/finances')] },
    { key: 'analytics', label: 'Analytics', icon: 'chart', targets: [view('/cockpit/analytics'), col('visitor-sessions')] },
    { key: 'seo', label: 'SEO', icon: 'search', targets: [view('/cockpit/seo')] },
  ] },
  { key: 'systeme', label: 'Système', items: [
    { key: 'ia', label: 'IA et coûts', icon: 'cpu', targets: [view('/cockpit/ia'), col('ai-usage')] },
    { key: 'securite', label: 'Sécurité', icon: 'lock', targets: [view('/cockpit/securite')] },
    { key: 'sante', label: 'Santé technique', icon: 'pulse', targets: [view('/cockpit/sante'), col('error-logs')] },
    { key: 'planifiees', label: 'Tâches planifiées', icon: 'clock', targets: [col('task-runs')] },
    { key: 'audit', label: 'Journal d’audit', icon: 'list', targets: [col('audit-log')] },
    { key: 'equipe', label: 'Équipe', icon: 'users', targets: [col('users')] },
    { key: 'commandes', label: 'Commandes et arrêt général', icon: 'power', targets: [glo('controls')] },
    { key: 'reglages-acc', label: 'Réglages de l’accompagnement', icon: 'sliders', targets: [glo('accompagnement')] },
  ] },
]

const hrefOf = (t: Target) =>
  t.kind === 'view' ? `/admin${t.path}` : t.kind === 'global' ? `/admin/globals/${t.slug}` : `/admin/collections/${t.slug}${t.query ? `?${t.query}` : ''}`

/** Construit le menu pour ce compte : entités qu’il peut lire (Payload) et écrans du cockpit livrés. */
export function buildNav(visible: Visible, views: readonly string[], role?: Role): NavGroup[] {
  const scope = role ? ROLE_SCOPE[role] : undefined
  const ok = (t: Target) =>
    t.kind === 'view' ? views.includes(t.path) : t.kind === 'global' ? visible.globals.includes(t.slug) : visible.collections.includes(t.slug)
  const mapped = new Set<string>()
  const groups: NavGroup[] = NAV_GROUPS.map((g) => ({
    key: g.key,
    label: g.label,
    items: g.items.flatMap((i) => {
      if (scope && !scope.includes(i.key)) { i.targets.forEach((t) => t.kind !== 'view' && mapped.add(`${t.kind}:${t.slug}`)); return [] }
      i.targets.forEach((t) => t.kind !== 'view' && mapped.add(`${t.kind}:${t.slug}`))
      const t = i.targets.find(ok)
      if (!t) return []
      const item: NavItem = { key: i.key, label: i.label, icon: i.icon, href: hrefOf(t) }
      if (i.badge) item.badge = i.badge
      if (i.lockedForAgents) item.lockedForAgents = true
      return [item]
    }),
  }))
  const others: NavItem[] = scope ? [] : [
    ...visible.collections.filter((s) => !mapped.has(`collection:${s}`)).map((s) => ({ key: s, label: s, icon: 'database' as const, href: hrefOf(col(s)) })),
    ...visible.globals.filter((s) => !mapped.has(`global:${s}`)).map((s) => ({ key: s, label: s, icon: 'sliders' as const, href: hrefOf(glo(s)) })),
  ]
  if (others.length) groups.push({ key: 'autres', label: 'Autres données', items: others })
  return groups.filter((g) => g.items.length > 0)
}
