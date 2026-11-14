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
import { buildConfig } from 'payload'

import { Users } from '@/platform/auth/Users'
import { Media } from '@/platform/storage/Media'
import { AiUsage } from '@/platform/ai/AiUsage'
import { ErrorLogs } from '@/platform/monitoring/ErrorLogs'
import { AuditLog } from '@/platform/audit/AuditLog'
import { TaskRuns } from '@/platform/tasks/TaskRuns'
import { EmailDeliveries } from '@/platform/mailing/EmailDeliveries'
import { auditPlugin } from '@/platform/audit/audit'
import { Controls } from '@/platform/controls/Controls'
import { AccompagnementRequests, AccompagnementSettings, Packs } from '@/modules/accompagnement/collections'
import { AgentMessages, AgentNotifications, AgentTasks, Agents } from '@/modules/agents/collections'
import { ClassifiedMessages, Classifieds } from '@/modules/annonces/collections'
import { Events, FeaturedDestination, Places } from '@/modules/annuaire/collections'
import { ContributionPhotos, Submissions } from '@/modules/messages/collections'
import { Campaigns, Subscribers, TelegramPosts } from '@/modules/communication/collections'
import { Members, VisitorSessions } from '@/modules/membres/collections'
import { Platforms, Procedures, Representations } from '@/modules/contenus/collections'
import { Appointments, Practitioners } from '@/modules/sante/collections'
import { MissionMessages, Missions, ProviderDocuments, ProviderReviews, Providers } from '@/modules/services/collections'
import { migrations } from './migrations'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

/** Base DALIL : intégration Neon du compte Vercel DALIL (préfixe DALIL_). */
const databaseUrl = process.env.DALIL_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL || ''

/** PAYLOAD_SECRET si défini, sinon dérivé de l’URL de base (secrète, injectée par Neon). */
const secret =
  process.env.PAYLOAD_SECRET || (databaseUrl ? createHash('sha256').update(`dalil:${databaseUrl}`).digest('hex') : '')

export default buildConfig({
  // GraphQL désactivé (audit 2026-11-02) : inutilisé par le site, schéma en échec ; une seule API publique (REST) à protéger.
  graphQL: { disable: true },
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: ' — DALIL Admin' },
    // Cockpit DALIL : menu, barre du haut et accueil Pilotage (module pilotage).
    components: {
      Nav: '@/modules/pilotage/admin/CockpitNav#CockpitNav',
      graphics: { Icon: '@/modules/pilotage/admin/Brand#DalilIcon', Logo: '@/modules/pilotage/admin/Brand#DalilLogo' },
      actions: ['@/modules/pilotage/admin/CockpitBar#CockpitBar'],
      views: {
        dashboard: { Component: '@/modules/pilotage/admin/PilotageView#PilotageView' },
        // Écrans du cockpit (lot 5). Contrôle d’accès dans CockpitPage ; chemins listés dans admin/data.ts.
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
      },
    },
  },
  // Admin en français par défaut ; arabe (RTL) et anglais en un clic (cockpit, lot 1).
  i18n: { supportedLanguages: { fr, ar, en }, fallbackLanguage: 'fr' },
  globals: [FeaturedDestination, Controls, AccompagnementSettings],
  collections: [Places, Events, Practitioners, Appointments, Providers, Missions, MissionMessages, ProviderReviews, ProviderDocuments, Classifieds, ClassifiedMessages, Packs, AccompagnementRequests, Procedures, Platforms, Representations, Media, Submissions, ContributionPhotos, Subscribers, Campaigns, TelegramPosts, Members, VisitorSessions, Users, Agents, AgentTasks, AgentMessages, AgentNotifications, AiUsage, ErrorLogs, TaskRuns, EmailDeliveries, AuditLog],
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
    pool: { connectionString: databaseUrl },
    migrationDir: path.resolve(dirname, 'migrations'),
    prodMigrations: migrations,
    push: false,
  }),
})
