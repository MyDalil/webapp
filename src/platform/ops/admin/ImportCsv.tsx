import { DefaultTemplate } from '@payloadcms/next/templates'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'
import { ImportCsvClient } from './ImportCsvClient'

/** Vue admin « Importer des adresses (CSV) » : simulation puis création en brouillon. Équipe seulement (patron, admin, editor). */
export function ImportCsv({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, permissions, visibleEntities, locale } = initPageResult
  const user = req.user as { collection?: string; role?: string } | null
  if (!user || user.collection !== 'users') redirect('/admin/login')
  const allowed = ['patron', 'admin', 'editor'].includes(String(user.role))
  return (
    <DefaultTemplate i18n={req.i18n} locale={locale} params={params} payload={req.payload} permissions={permissions} req={req} searchParams={searchParams} user={req.user ?? undefined} visibleEntities={visibleEntities}>
      <div className="gutter--left gutter--right" style={{ paddingTop: 'calc(var(--base) * 2)', paddingBottom: 'calc(var(--base) * 3)' }}>
        <h1>Importer des adresses (CSV)</h1>
        {allowed ? <ImportCsvClient /> : <p>Accès réservé à l’équipe.</p>}
      </div>
    </DefaultTemplate>
  )
}
