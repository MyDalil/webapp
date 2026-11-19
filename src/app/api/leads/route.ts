import config from '@payload-config'
import { REST_DELETE, REST_GET, REST_PATCH } from '@payloadcms/next/routes'
import { fail, json } from '@/platform/http'
import { guard } from '@/platform/security/rateLimit'
import { proofError } from '@/platform/security/proof'
import { currentMember } from '@/modules/membres'
import { submitLead, validateLead } from '@/modules/pros'

/** Demande d’un visiteur sur une fiche privée (devis, pré-inscription, rappel) : limite de débit, preuve anti-robot, validation. */
export async function POST(req: Request) {
  const limited = await guard('leads', 5, 3600)
  if (limited) return limited
  const robot = await proofError(req)
  if (robot) return fail(robot, 403)
  const v = validateLead(await req.json().catch(() => null))
  if (!v.ok) return fail(v.error)
  const member = await currentMember().catch(() => null)
  const r = await submitLead(v.lead, { memberId: (member as { id?: number } | null)?.id ?? null })
  if (!r.ok) return fail(r.error, r.status)
  return json({ ok: true })
}

/**
 * Cette route masque la racine REST de Payload (`/api/leads`) : lecture et actions groupées de /admin
 * lui sont renvoyées, avec les droits de la collection (équipe : tout ; membre : ses demandes ; visiteur : rien).
 */
const root = () => ({ params: Promise.resolve({ slug: ['leads'] }) })
const restGet = REST_GET(config)
const restPatch = REST_PATCH(config)
const restDelete = REST_DELETE(config)
export const GET = (req: Request) => restGet(req, root())
export const PATCH = (req: Request) => restPatch(req, root())
export const DELETE = (req: Request) => restDelete(req, root())
