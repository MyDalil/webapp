import { randomBytes } from 'crypto'
import { clean, fail, isEmail, json, payload } from '@/lib/site'
import { SITE, layout, send } from '@/lib/mail'

/** Inscription newsletter en double confirmation : rien n’est envoyé à l’adresse tant que le lien n’est pas cliqué. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  if (clean(body.website)) return json({ ok: true }) // champ piège anti-spam
  if (!isEmail(body.email)) return fail('Adresse email invalide.')
  const email = String(body.email).trim().toLowerCase()
  const p = await payload()
  const found = await p.find({ collection: 'subscribers', where: { email: { equals: email } }, limit: 1, overrideAccess: true, showHiddenFields: true })
  const existing = found.docs[0]
  if (existing?.confirmedAt) return json({ ok: true })
  const token = randomBytes(24).toString('base64url')
  if (existing) await p.update({ collection: 'subscribers', id: existing.id, data: { token }, overrideAccess: true })
  else await p.create({ collection: 'subscribers', data: { email, source: clean(body.source, 80), token }, overrideAccess: true })
  await send(
    email,
    'Confirmez votre inscription à DALIL',
    layout(
      'Une dernière étape.',
      '<p>Confirmez votre adresse pour recevoir les nouvelles de DALIL : ouvertures, nouveaux guides et adresses vérifiées.</p><p>Si vous n’êtes pas à l’origine de cette demande, ignorez simplement cet email.</p>',
      { label: 'Confirmer mon inscription', href: `${SITE}/api/subscribers/confirm?token=${token}` },
    ),
  )
  return json({ ok: true })
}
