import { classifiedAction, currentMember, updateClassified } from '@/modules/annonces'
import { fail, json } from '@/platform/http'
import { guard } from '@/platform/security/rateLimit'
import { readFile } from '@/platform/storage/images'

type Ctx = { params: Promise<{ id: string }> }

/** Modification (multipart) : champs, photos gardées (« keep », identifiants), nouvelles « photos ». Repasse au contrôle. */
export async function PUT(req: Request, { params }: Ctx) {
  const member = await currentMember()
  if (!member) return fail('Non connecté.', 401)
  const limited = await guard('annonce', 10, 3600, `m${member.id}`)
  if (limited) return limited
  const form = await req.formData().catch(() => null)
  if (!form) return fail('Formulaire invalide.')
  const files = (await Promise.all(form.getAll('photos').map(readFile))).filter((f): f is Buffer => Boolean(f?.length))
  const keep = form.getAll('keep').map(Number).filter(Number.isFinite)
  const raw = Object.fromEntries([...form.entries()].filter(([k, v]) => k !== 'photos' && k !== 'keep' && typeof v === 'string'))
  const r = await updateClassified(member, Number((await params).id), raw, files, keep)
  return 'error' in r ? fail(r.error, r.status) : json(r)
}

/** Actions de l’auteur : { action: 'renew' | 'close' | 'delete' }. */
export async function POST(req: Request, { params }: Ctx) {
  const member = await currentMember()
  if (!member) return fail('Non connecté.', 401)
  const b = await req.json().catch(() => ({}))
  const r = await classifiedAction(member, Number((await params).id), String(b.action ?? ''))
  return 'error' in r ? fail(r.error, r.status) : json(r)
}
