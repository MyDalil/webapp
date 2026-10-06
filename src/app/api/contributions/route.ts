import { clean, fail, isEmail, json } from '@/platform/http'
import { readSession } from '@/modules/membres'
import { record } from '@/modules/messages'

export async function POST(req: Request) {
  const fd = await req.formData().catch(() => null)
  if (!fd) return fail('Formulaire invalide.')
  if (clean(fd.get('website'))) return json({ ok: true })
  const data: Record<string, unknown> = {}
  const files: { name: string; size: number; type: string }[] = []
  for (const [k, v] of fd.entries()) {
    if (k === 'website') continue
    if (typeof v === 'string') data[k] = clean(v, 5000)
    else if (v && v.size) files.push({ name: v.name, size: v.size, type: v.type })
  }
  if (files.length) data.files = files
  const title = clean(data.title, 200)
  if (!title) return fail('Indiquez le nom du lieu ou de l’information.')
  const email = clean(data.email, 200)
  if (email && !isEmail(email)) return fail('Adresse email invalide.')
  const s = await readSession()
  await record('contribution', title, data, email, s?.sid)
  return json({ ok: true })
}
