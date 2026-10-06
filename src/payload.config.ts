import { createHash } from 'crypto'
import path from 'path'
import { fileURLToPath } from 'url'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { fr } from '@payloadcms/translations/languages/fr'
import { buildConfig } from 'payload'

import { Users } from './collections/Users'
import { Submissions, Subscribers, VisitorSessions } from './collections/Inbox'
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
  collections: [Submissions, Subscribers, VisitorSessions, Users],
  editor: lexicalEditor(),
  secret,
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({
    pool: { connectionString: databaseUrl },
    migrationDir: path.resolve(dirname, 'migrations'),
    prodMigrations: migrations,
    push: false,
  }),
})
