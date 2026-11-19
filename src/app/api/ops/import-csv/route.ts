import { fail, json, payload } from '@/platform/http'
import { OpsError } from '@/platform/ops/context'
import { MAX_CSV_BYTES, MAX_CSV_LABEL } from '@/platform/ops/csv'
import { newActionId, runAction } from '@/registry'
import { ActionError } from '@/platform/actions'
import type { StaffRole } from '@/platform/actions/types'

/** Un lot de 150 lignes par requête ; la simulation et la création tiennent dans cette durée. */
export const maxDuration = 300

/**
 * Import CSV depuis /admin (vue « Importer des adresses ») : session Payload de l’équipe, exécute l’action importer_csv.
 * Une requête = un lot ; la réponse donne `suite` (à renvoyer dans `depuis`) tant que le fichier n’est pas terminé.
 */
export async function POST(req: Request) {
  const p = await payload()
  const { user } = await p.auth({ headers: req.headers })
  const u = user as { id: number; collection?: string; role?: string; name?: string } | null
  if (u?.collection !== 'users' || !['admin', 'patron', 'editor'].includes(String(u.role))) return fail('Accès refusé.', 401)
  const body = (await req.json().catch(() => null)) as { csv?: unknown; wilaya?: unknown; confirmer?: unknown; depuis?: unknown } | null
  if (!body || typeof body.csv !== 'string') return fail('Fichier CSV manquant.')
  if (Buffer.byteLength(body.csv, 'utf8') > MAX_CSV_BYTES) return fail(`Fichier trop lourd (${MAX_CSV_LABEL} maximum).`)
  const depuis = body.depuis == null ? undefined : Number(body.depuis)
  if (depuis !== undefined && (!Number.isInteger(depuis) || depuis < 0)) return fail('Reprise invalide.')
  try {
    const out = await runAction(
      'importer_csv',
      { collection: 'places', csv: body.csv, wilaya: typeof body.wilaya === 'string' ? body.wilaya : undefined, confirmer: body.confirmer === true, depuis },
      { principal: { kind: 'staff', userId: u.id, role: u.role as StaffRole, name: String(u.name ?? '') }, channel: 'admin', actionId: newActionId(), lang: 'fr' },
    )
    return json(out)
  } catch (e) {
    if (e instanceof OpsError || e instanceof ActionError) return fail(e.message, 400)
    throw e
  }
}
