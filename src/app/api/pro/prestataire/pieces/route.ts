import { currentMember, uploadProviderDocument } from '@/modules/services'
import { fail, json } from '@/platform/http'
import { readFile } from '@/platform/storage/images'
import { guard } from '@/platform/security/rateLimit'

/** Pièce justificative (multipart : « kind » + « file »), visible par l’équipe seulement. */
export async function POST(req: Request) {
  const member = await currentMember()
  if (!member) return fail('Non connecté.', 401)
  const limited = await guard('upload', 20, 3600, `m${member.id}`)
  if (limited) return limited
  const form = await req.formData().catch(() => null)
  const r = await uploadProviderDocument(member, String(form?.get('kind') ?? ''), await readFile(form?.get('file') ?? null))
  return 'error' in r ? fail(r.error, r.status) : json(r, 201)
}
