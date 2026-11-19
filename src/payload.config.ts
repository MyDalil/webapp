import { createHash } from 'crypto'
import path from 'path'
import { fileURLToPath } from 'url'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { ar } from '@payloadcms/translations/languages/ar'
import { en } from '@payloadcms/translations/languages/en'
import { fr } from '@payloadcms/translations/languages/fr'
import { resendAdapter } from '@payloadcms/email-resend'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import sharp from 'sharp'
import { buildConfig, type AdminViewConfig, type CollectionConfig } from 'payload'

import { Users } from '@/platform/auth/Users'
import { Media } from '@/platform/storage/Media'
import { AiUsage } from '@/platform/ai/AiUsage'
import { ErrorLogs } from '@/platform/monitoring/ErrorLogs'
import { AuditLog } from '@/platform/audit/AuditLog'
import { TaskRuns } from '@/platform/tasks/TaskRuns'
import { EmailDeliveries } from '@/platform/mailing/EmailDeliveries'
import { auditPlugin } from '@/platform/audit/audit'
import { Controls } from '@/platform/controls/Controls'
import { Translations } from '@/platform/i18n/Translations'
import { MetricsDaily } from '@/platform/metrics/Metrics'
import { pluginEnabled } from '@/platform/plugins'
import { AccompagnementRequests, AccompagnementSettings, Packs } from '@/modules/accompagnement/collections'
import { AgentMessages, AgentNotifications, AgentTasks, Agents } from '@/modules/agents/collections'
import { ClassifiedMessages, Classifieds } from '@/modules/annonces/collections'
import { Events, FeaturedDestination, Places } from '@/modules/annuaire/collections'
import { ContributionPhotos, Submissions } from '@/modules/messages/collections'
import { BotSessions, Campaigns, Subscribers, TelegramPosts } from '@/modules/communication/collections'
import { Members, VisitorSessions } from '@/modules/membres/collections'
import { Faqs, Moments, Platforms, Procedures, Representations } from '@/modules/contenus/collections'
import { ClaimDocuments, Claims, Leads, Payments, Pricing, Sponsorships, Subscriptions } from '@/modules/pros/collections'
import { Appointments, Practitioners } from '@/modules/sante/collections'
import { MissionMessages, Missions, ProviderDocuments, ProviderReviews, Providers } from '@/modules/services/collections'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

/** Base DALIL : intégration Neon du compte Vercel DALIL (préfixe DALIL_). */
const databaseUrl = process.env.DALIL_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL || ''
/**
 * Connexion du pool : `sslmode=require` (URL Neon) est déjà traité comme `verify-full` par le pilote, qui l’écrit
 * en avertissement à chaque démarrage. On écrit `verify-full` : même sécurité, plus de journal inutile.
 * `databaseUrl` reste intact : le secret de secours en dépend.
 */
const poolUrl = databaseUrl.replace(/([?&]sslmode=)(require|prefer|verify-ca)\b/, '$1verify-full')

/** PAYLOAD_SECRET si défini, sinon dérivé de l’URL de base (secrète, injectée par Neon). */
const secret =
  process.env.PAYLOAD_SECRET || (databaseUrl ? createHash('sha256').update(`dalil:${databaseUrl}`).digest('hex') : '')

/** Extras débranchables (DALIL_PLUGINS) : voir src/platform/plugins.ts. */
const cockpit = pluginEnabled('cockpit')
const agents = pluginEnabled('agents')

/** Équipe IA débranchée : collections gardées (tables, relations comme ai-usage.agent) mais cachées dans l’admin. */
const hiddenUnless = (on: boolean) => (c: CollectionConfig): CollectionConfig => (on ? c : { ...c, admin: { ...c.admin, hidden: true } })

/** Cockpit : accueil Pilotage et écrans (lot 5). Contrôle d’accès dans CockpitPage ; chemins listés dans admin/data.ts. */
const cockpitViews: Record<string, AdminViewConfig> = {
  dashboard: { Component: '@/modules/pilotage/admin/PilotageView#PilotageView' },
  cockpitAgents: { Component: '@/modules/pilotage/admin/views/AgentsView#AgentsView', path: '/cockpit/agents' },
  cockpitTaches: { Component: '@/modules/pilotage/admin/views/TachesView#TachesView', path: '/cockpit/taches' },
  cockpitValidation: { Component: '@/modules/pilotage/admin/views/ValidationView#ValidationView', path: '/cockpit/validation' },
  cockpitActivite: { Component: '@/modules/pilotage/admin/views/ActiviteView#ActiviteView', path: '/cockpit/activite' },
  cockpitConversations: { Component: '@/modules/pilotage/admin/views/ConversationsView#ConversationsView', path: '/cockpit/conversations' },
  cockpitMemoire: { Component: '@/modules/pilotage/admin/views/MemoireView#MemoireView', path: '/cockpit/memoire' },
  cockpitConnecteurs: { Component: '@/modules/pilotage/admin/views/ConnecteursView#ConnecteursView', path: '/cockpit/connecteurs' },
  cockpitMedias: { Component: '@/modules/pilotage/admin/views/MediasView#MediasView', path: '/cockpit/medias' },
  cockpitHistorique: { Component: '@/modules/pilotage/admin/views/HistoriqueView#HistoriqueView', path: '/cockpit/historique' },
  cockpitBoite: { Component: '@/modules/pilotage/admin/views/BoiteView#BoiteView', path: '/cockpit/boite' },
  cockpitModeration: { Component: '@/modules/pilotage/admin/views/CommunauteViews#ModerationView', path: '/cockpit/moderation' },
  cockpitAnnonces: { Component: '@/modules/pilotage/admin/views/CommunauteViews#AnnoncesView', path: '/cockpit/annonces' },
  cockpitPros: { Component: '@/modules/pilotage/admin/views/CommunauteViews#ProsView', path: '/cockpit/pros' },
  cockpitMembres: { Component: '@/modules/pilotage/admin/views/CommunauteViews#MembresView', path: '/cockpit/membres' },
  cockpitIa: { Component: '@/modules/pilotage/admin/views/SystemeViews#IaView', path: '/cockpit/ia' },
  cockpitSante: { Component: '@/modules/pilotage/admin/views/SystemeViews#SanteView', path: '/cockpit/sante' },
  cockpitSecurite: { Component: '@/modules/pilotage/admin/views/SystemeViews#SecuriteView', path: '/cockpit/securite' },
  cockpitAnalytics: { Component: '@/modules/pilotage/admin/views/BusinessViews#AnalyticsView', path: '/cockpit/analytics' },
  cockpitNewsletter: { Component: '@/modules/pilotage/admin/views/BusinessViews#NewsletterView', path: '/cockpit/newsletter' },
  cockpitFinances: { Component: '@/modules/pilotage/admin/views/BusinessViews#FinancesView', path: '/cockpit/finances' },
  cockpitSeo: { Component: '@/modules/pilotage/admin/views/BusinessViews#SeoView', path: '/cockpit/seo' },
  cockpitCouverture: { Component: '@/modules/pilotage/admin/views/BusinessViews#CouvertureView', path: '/cockpit/couverture' },
  cockpitTraductions: { Component: '@/modules/pilotage/admin/views/BusinessViews#TraductionsView', path: '/cockpit/traductions' },
  cockpitRecherches: { Component: '@/modules/pilotage/admin/views/BusinessViews#RecherchesView', path: '/cockpit/recherches' },
}

export default buildConfig({
  // GraphQL désactivé (audit 2026-11-02) : inutilisé par le site, schéma en échec ; une seule API publique (REST) à protéger.
  graphQL: { disable: true },
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: ' — DALIL Admin' },
    // Logo DALIL conservé dans tous les cas. Cockpit (menu, barre du haut, accueil Pilotage, vues /cockpit/*) : extra `cockpit`.
    components: {
      graphics: { Icon: '@/modules/pilotage/admin/Brand#DalilIcon', Logo: '@/modules/pilotage/admin/Brand#DalilLogo' },
      ...(cockpit ? { Nav: '@/modules/pilotage/admin/CockpitNav#CockpitNav', actions: ['@/modules/pilotage/admin/CockpitBar#CockpitBar'] } : {}),
      // Accueil de l’équipe (lot I) au-dessus du tableau de bord ; lien « Importer des adresses » sous la navigation.
      beforeDashboard: ['@/platform/shell/admin/AccueilEquipe#AccueilEquipe'],
      afterNavLinks: ['@/platform/shell/admin/LiensEquipe#LiensEquipe'],
      views: {
        // Import CSV (module plateforme ops, vue du lot C2).
        importCsv: { Component: '@/platform/ops/admin/ImportCsv#ImportCsv', path: '/import' },
        controle: { Component: '@/platform/shell/admin/ControleView#ControleView', path: '/controle' },
        // File unique de validation (lot K) : brouillons, revendications, abonnements, paiements, contributions.
        validation: { Component: '@/platform/shell/admin/ValidationView#ValidationView', path: '/validation' },
        ...(cockpit ? cockpitViews : {}),
      },
    },
  },
  // Admin en français par défaut ; arabe (RTL) et anglais en un clic (cockpit, lot 1).
  i18n: { supportedLanguages: { fr, ar, en }, fallbackLanguage: 'fr' },
  globals: [FeaturedDestination, Controls, AccompagnementSettings, Pricing],
  collections: [Places, Events, Practitioners, Appointments, Providers, Missions, MissionMessages, ProviderReviews, ProviderDocuments, Classifieds, ClassifiedMessages, Packs, AccompagnementRequests, Procedures, Platforms, Representations, Faqs, Moments, Translations, Sponsorships, Payments, Subscriptions, Claims, ClaimDocuments, Leads, MetricsDaily, Media, Submissions, ContributionPhotos, Subscribers, Campaigns, TelegramPosts, BotSessions, Members, VisitorSessions, Users, ...[Agents, AgentTasks, AgentMessages, AgentNotifications].map(hiddenUnless(agents)), AiUsage, ErrorLogs, TaskRuns, EmailDeliveries, AuditLog],
  editor: lexicalEditor(),
  // Emails de l’admin (mot de passe oublié…) envoyés depuis salam@mydalil.com via Resend.
  ...(process.env.RESEND_API_KEY
    ? { email: resendAdapter({ defaultFromAddress: 'salam@mydalil.com', defaultFromName: 'DALIL', apiKey: process.env.RESEND_API_KEY }) }
    : {}),
  secret,
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  plugins: [
    // Journal d’audit greffé sur toutes les collections et réglages (ajout seul).
    auditPlugin,
    // Photos sur Vercel Blob dès que le store est relié au projet (BLOB_READ_WRITE_TOKEN injecté par Vercel).
    vercelBlobStorage({
      enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      collections: { media: true },
      token: process.env.BLOB_READ_WRITE_TOKEN || '',
    }),
  ],
  // Formats des photos (vignette, carte, couverture, partage) en WebP, point focal.
  sharp,
  db: postgresAdapter({
    pool: { connectionString: poolUrl },
    migrationDir: path.resolve(dirname, 'migrations'),
    push: false,
  }),
})
