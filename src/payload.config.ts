import { createHash } from 'crypto'
import path from 'path'
import { fileURLToPath } from 'url'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { fr } from '@payloadcms/translations/languages/fr'
import { en } from '@payloadcms/translations/languages/en'
import { ar } from '@payloadcms/translations/languages/ar'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Sectors, Specialties, Wilayas } from './collections/Taxonomy'
import { Listings } from './collections/Listings'
import { Articles, Guides, Pages } from './collections/Editorial'
import { Submissions, Subscribers } from './collections/Inbox'
import { Home, Settings } from './globals/Home'
import { migrations } from './migrations'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || ''

/**
 * Secret de signature des sessions. PAYLOAD_SECRET si défini ;
 * sinon dérivé de l'URL de base (secrète, injectée par l'intégration Neon).
 */
const secret =
  process.env.PAYLOAD_SECRET ||
  (databaseUrl ? createHash('sha256').update(`dalil:${databaseUrl}`).digest('hex') : '')

export default buildConfig({
  serverURL: process.env.NEXT_PUBLIC_SITE_URL || '',
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: ' — DALIL Admin' },
  },
  i18n: { supportedLanguages: { fr, en, ar }, fallbackLanguage: 'fr' },
  localization: {
    locales: [
      { label: 'Français', code: 'fr' },
      { label: 'English', code: 'en' },
      { label: 'العربية', code: 'ar', rtl: true },
    ],
    defaultLocale: 'fr',
    fallback: true,
  },
  collections: [Listings, Sectors, Specialties, Wilayas, Guides, Articles, Pages, Media, Submissions, Subscribers, Users],
  globals: [Home, Settings],
  editor: lexicalEditor(),
  secret,
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({
    pool: { connectionString: databaseUrl },
    migrationDir: path.resolve(dirname, 'migrations'),
    prodMigrations: migrations,
    push: false,
  }),
  sharp,
  plugins: [
    vercelBlobStorage({
      enabled: !!process.env.BLOB_READ_WRITE_TOKEN,
      collections: { media: true },
      token: process.env.BLOB_READ_WRITE_TOKEN,
      clientUploads: true,
    }),
  ],
})
