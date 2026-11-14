import { createLocalReq } from 'payload'
import { replaceEverywhere } from '@/platform/storage'
import { fail, json, payload } from '@/platform/http'

export const maxDuration = 60

/** Remplacer une photo par une autre partout où elle est utilisée. Administrateur ou patron ; chaque écriture est auditée. */
export async function POST(req: Request) {
  const p = await payload()
  const { user } = await p.auth({ headers: req.headers })
  const u = user as { collection?: string; role?: string } | null
  if (u?.collection !== 'users' || !['admin', 'patron'].includes(String(u.role))) return fail('Accès refusé.', 401)
  const body = (await req.json().catch(() => ({}))) as { from?: unknown; to?: unknown }
  const from = Number(body.from), to = Number(body.to)
  if (!Number.isInteger(from) || !Number.isInteger(to) || from <= 0 || to <= 0 || from === to) return fail('Deux photos différentes sont nécessaires.')
  const r = createLocalReq({ user: user as never }, p)
  const exists = await p.find({ collection: 'media', req: await r, overrideAccess: false, depth: 0, limit: 1, where: { id: { equals: to } } })
  if (!exists.totalDocs) return fail('La photo de remplacement n’existe pas.', 404)
  const res = await replaceEverywhere(await r, from, to)
  return json(res, res.failed.length ? 207 : 200)
}
