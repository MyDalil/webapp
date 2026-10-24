import { currentMember, reportClassified } from '@/modules/annonces'
import { fail, json } from '@/platform/http'
import { guard } from '@/platform/security/rateLimit'

/** Signaler une annonce (arnaque, contenu interdit, déjà vendue…). Ouvert à tous, limité. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = await guard('signalement', 5, 3600)
  if (limited) return limited
  const b = await req.json().catch(() => ({}))
  const member = await currentMember()
  const r = await reportClassified(Number((await params).id), String(b.reason ?? ''), member?.email)
  return 'error' in r ? fail(r.error, r.status) : json(r, 201)
}
