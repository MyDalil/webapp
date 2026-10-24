import { createHash } from 'crypto'
import path from 'path'
import { fileURLToPath } from 'url'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { fr } from '@payloadcms/translations/languages/fr'
import { resendAdapter } from '@payloadcms/email-resend'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { buildConfig } from 'payload'

import { Users } from '@/platform/auth/Users'
import { Media } from '@/platform/storage/Media'
import { AiUsage } from '@/platform/ai/AiUsage'
import { ErrorLogs } from '@/platform/monitoring/ErrorLogs'
import { AuditLog } from '@/platform/audit/AuditLog'
import { auditPlugin } from '@/platform/audit/audit'
import { Controls } from '@/platform/controls/Controls'
import { AgentMessages, AgentTasks, Agents } from '@/modules/agents/collections'
import { ClassifiedMessages, Classifieds } from '@/modules/annonces/collections'
import { Events, FeaturedDestination, Places } from '@/modules/annuaire/collections'
import { ContributionPhotos, Submissions } from '@/modules/messages/collections'
import { Campaigns, Subscribers, TelegramPosts } from '@/modules/communication/collections'
import { Members, VisitorSessions } from '@/modules/membres/collections'
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
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: ' — DALIL Admin' },
  },
  i18n: { supportedLanguages: { fr }, fallbackLanguage: 'fr' },
  globals: [FeaturedDestination, Controls],
  collections: [Places, Events, Practitioners, Appointments, Providers, Missions, MissionMessages, ProviderReviews, ProviderDocuments, Classifieds, ClassifiedMessages, Media, Submissions, ContributionPhotos, Subscribers, Campaigns, TelegramPosts, Members, VisitorSessions, Users, Agents, AgentTasks, AgentMessages, AiUsage, ErrorLogs, AuditLog],
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
  db: postgresAdapter({
    pool: { connectionString: databaseUrl },
    migrationDir: path.resolve(dirname, 'migrations'),
    prodMigrations: migrations,
    push: false,
  }),
})
