import { createClassified, currentMember, myClassifieds } from '@/modules/annonces'
import { fail, json } from '@/platform/http'
import { guard } from '@/platform/security/rateLimit'
import { readFile } from '@/platform/storage/images'

/** Mes annonces et mes conversations. */
export async function GET() {
  const member = await currentMember()
  if (!member) return fail('Non connecté.', 401)
  return json(await myClassifieds(member))
}

/** Dépôt d’une annonce (multipart : champs de l’annonce + jusqu’à 8 « photos »). */
export async function POST(req: Request) {
  const member = await currentMember()
  if (!member) return fail('Non connecté.', 401)
  const limited = await guard('annonce', 10, 3600, `m${member.id}`)
  if (limited) return limited
  const form = await req.formData().catch(() => null)
  if (!form) return fail('Formulaire invalide.')
  const files = (await Promise.all(form.getAll('photos').map(readFile))).filter((f): f is Buffer => Boolean(f?.length))
  const raw = Object.fromEntries([...form.entries()].filter(([k, v]) => k !== 'photos' && typeof v === 'string'))
  const r = await createClassified(member, raw, files)
  return 'error' in r ? fail(r.error, r.status) : json(r, 201)
}
