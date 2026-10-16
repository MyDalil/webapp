import { currentMember, setProviderPhoto } from '@/modules/services'
import { fail, json } from '@/platform/http'
import { readFile } from '@/platform/storage/images'
import { guard } from '@/platform/security/rateLimit'

/** Photo de profil du prestataire (multipart, champ « photo »). */
export async function POST(req: Request) {
  const member = await currentMember()
  if (!member) return fail('Non connecté.', 401)
  const limited = await guard('upload', 20, 3600, `m${member.id}`)
  if (limited) return limited
  const form = await req.formData().catch(() => null)
  const r = await setProviderPhoto(member, await readFile(form?.get('photo') ?? null))
  return 'error' in r ? fail(r.error, r.status) : json(r)
}
