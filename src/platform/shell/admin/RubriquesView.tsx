import { DefaultTemplate } from '@payloadcms/next/templates'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'
import { getControls } from '@/platform/controls/Controls'
import { DEFAULT_OFF_MESSAGE, normalizeOff, sectionTree } from '@/platform/controls/sections'
import { isTeam } from './accueil'
import { RubriquesSwitches } from './RubriquesSwitches'
import { ADMIN_CSS } from './styles'

/**
 * Vue admin « Rubriques » (`admin.components.views.rubriques`, chemin `/rubriques`) : un interrupteur par rubrique du menu
 * et par catégorie de l’annuaire. Coupée = le public voit « revient sous peu ». Lecture équipe ; bascule patron et admin.
 */
export async function RubriquesView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, permissions, visibleEntities, locale } = initPageResult
  const user = req.user as { collection?: string; role?: string } | null
  if (!user || user.collection !== 'users') redirect('/admin/login')
  const allowed = isTeam(req.user)
  const canEdit = allowed && ['patron', 'admin'].includes(String(user.role))
  const c = allowed ? ((await getControls(req.payload)) as { offSections?: unknown; offMessage?: string | null }) : null
  return (
    <DefaultTemplate i18n={req.i18n} locale={locale} params={params} payload={req.payload} permissions={permissions} req={req} searchParams={searchParams} user={req.user ?? undefined} visibleEntities={visibleEntities}>
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} />
      <div className="gutter--left gutter--right" style={{ paddingTop: 'calc(var(--base) * 2)', paddingBottom: 'calc(var(--base) * 3)', maxWidth: 900 }}>
        <h1>Rubriques</h1>
        {!allowed || !c ? (
          <p>Accès réservé à l’équipe.</p>
        ) : (
          <>
            <p style={{ color: 'var(--theme-elevation-600)', marginBottom: 'var(--base)' }}>
              Un clic coupe ou rallume. Une partie coupée reste dans le menu ; ses pages affichent « {DEFAULT_OFF_MESSAGE.fr} », sortent du plan du site et de la recherche.
              Couper une rubrique coupe aussi ses catégories.{canEdit ? '' : ' Modification réservée au patron et aux administrateurs.'}
            </p>
            <RubriquesSwitches tree={sectionTree()} initialOff={normalizeOff(c.offSections)} initialMessage={c.offMessage ?? ''} defaultMessage={DEFAULT_OFF_MESSAGE.fr} canEdit={canEdit} />
          </>
        )}
      </div>
    </DefaultTemplate>
  )
}
