import { currentMember, leaveReview } from '@/modules/services'
import { fail, json } from '@/platform/http'
import { readFile } from '@/platform/storage/images'

/** Avis (multipart : « rating », « comment », jusqu’à 4 « photos »). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const member = await currentMember()
  if (!member) return fail('Non connecté.', 401)
  const form = await req.formData().catch(() => null)
  if (!form) return fail('Formulaire invalide.')
  const files = (await Promise.all(form.getAll('photos').map(readFile))).filter((f): f is Buffer => Boolean(f?.length))
  const comment = form.get('comment')
  const r = await leaveReview(member, Number((await params).id), Number(form.get('rating')), typeof comment === 'string' ? comment : undefined, files)
  return 'error' in r ? fail(r.error, r.status) : json({ mission: r }, 201)
}
