import { currentMember } from '@/modules/membres'
import { createClaim } from '@/modules/pros'
import { proofFileError } from '@/modules/pros/ui'
import { fail, json } from '@/platform/http'
import { readFile } from '@/platform/storage/images'
import { guard } from '@/platform/security/rateLimit'

/** Revendication d’une fiche (multipart : targetCollection, slug, proofType, proofText, file facultatif ≤ 5 Mo). */
export async function POST(req: Request) {
  const member = await currentMember()
  if (!member) return fail('Non connecté.', 401)
  const limited = await guard('pro-revendication', 5, 3600, `member:${member.id}`)
  if (limited) return limited
  const form = await req.formData().catch(() => null)
  if (!form) return fail('Demande illisible.')
  const f = form.get('file')
  const file = f && typeof f !== 'string' && f.size ? f : null
  const bad = proofFileError(file)
  if (bad) return fail(bad)
  const body = Object.fromEntries(['targetCollection', 'slug', 'proofType', 'proofText'].map((k) => [k, form.get(k)]))
  const r = await createClaim(member, body, file ? await readFile(file) : null)
  return 'error' in r ? fail(r.error, r.status) : json({ ok: true, id: r.id, message: 'Demande reçue. L’équipe DALIL vérifie votre justificatif ; suivez-la dans votre espace pro.' }, 201)
}
