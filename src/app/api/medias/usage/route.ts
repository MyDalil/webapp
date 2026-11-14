import { createLocalReq } from 'payload'
import { usageOf } from '@/platform/storage'
import { fail, json, payload } from '@/platform/http'

/** Où une photo est utilisée. Équipe seulement (droits de la session). */
export async function GET(req: Request) {
  const p = await payload()
  const { user } = await p.auth({ headers: req.headers })
  const u = user as { collection?: string; role?: string } | null
  if (u?.collection !== 'users' || !['admin', 'patron', 'editor'].includes(String(u.role))) return fail('Accès refusé.', 401)
  const id = Number(new URL(req.url).searchParams.get('id'))
  if (!Number.isInteger(id) || id <= 0) return fail('Photo manquante.')
  return json({ id, uses: await usageOf(await createLocalReq({ user: user as never }, p), id) })
}
