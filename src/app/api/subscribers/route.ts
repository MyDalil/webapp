import { clean, fail, isEmail, json, payload } from '@/lib/site'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  if (clean(body.website)) return json({ ok: true }) // champ piège anti-spam
  if (!isEmail(body.email)) return fail('Adresse email invalide.')
  const email = String(body.email).trim().toLowerCase()
  const p = await payload()
  const found = await p.find({ collection: 'subscribers', where: { email: { equals: email } }, limit: 1, overrideAccess: true })
  if (!found.docs.length) {
    await p.create({ collection: 'subscribers', data: { email, source: clean(body.source, 80) }, overrideAccess: true })
  }
  return json({ ok: true })
}
