import { randomBytes } from 'crypto'
import { clean, fail, isEmail, json, payload } from '@/platform/http'
import { SITE, layout, send } from '@/platform/mail'
import { guard, hit, tooMany } from '@/platform/security/rateLimit'
import { proofError } from '@/platform/security/proof'

const token = () => randomBytes(24).toString('base64url')

/** Inscription newsletter en double confirmation : rien n’est envoyé à l’adresse tant que le lien n’est pas cliqué. */
export async function POST(req: Request) {
  const limited = await guard('newsletter', 5, 3600)
  if (limited) return limited
  const robot = await proofError(req)
  if (robot) return fail(robot, 403)
  const body = await req.json().catch(() => ({}))
  if (clean(body.website)) return json({ ok: true }) // champ piège anti-spam
  if (!isEmail(body.email)) return fail('Adresse email invalide.')
  const email = String(body.email).trim().toLowerCase()
  // Une même adresse ne reçoit pas plus de 3 emails de confirmation par jour (pas d’envoi en masse vers un tiers).
  const wait = await hit('newsletter-email', email, 3, 86400)
  if (wait) return tooMany(wait)
  const p = await payload()
  const found = await p.find({ collection: 'subscribers', where: { email: { equals: email } }, limit: 1, overrideAccess: true, showHiddenFields: true })
  const existing = found.docs[0]
  if (existing?.confirmedAt && !existing.unsubscribedAt) return json({ ok: true })
  const confirm = token()
  if (existing) await p.update({ collection: 'subscribers', id: existing.id, data: { token: confirm, confirmedAt: null, unsubscribedAt: null }, overrideAccess: true })
  else await p.create({ collection: 'subscribers', data: { email, source: clean(body.source, 80), token: confirm, unsubToken: token() }, overrideAccess: true })
  await send(
    email,
    'Confirmez votre inscription à DALIL',
    layout(
      'Une dernière étape.',
      '<p>Confirmez votre adresse pour recevoir les nouvelles de DALIL : ouvertures, nouveaux guides et adresses vérifiées.</p><p>Si vous n’êtes pas à l’origine de cette demande, ignorez simplement cet email : vous ne recevrez rien d’autre.</p>',
      { label: 'Confirmer mon inscription', href: `${SITE}/api/subscribers/confirm?token=${confirm}` },
    ),
  )
  return json({ ok: true })
}
