import { randomBytes } from 'crypto'
import { redirect } from 'next/navigation'
import { payload } from '@/platform/http'
import { SITE, layout, send, unsubscribe } from '@/platform/mail'

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token') ?? ''
  let ok = false
  if (/^[A-Za-z0-9_-]{20,64}$/.test(token)) {
    const p = await payload()
    const { docs } = await p.find({ collection: 'subscribers', where: { token: { equals: token } }, limit: 1, overrideAccess: true, showHiddenFields: true })
    const sub = docs[0]
    if (sub) {
      const unsubToken = sub.unsubToken || randomBytes(24).toString('base64url')
      await p.update({ collection: 'subscribers', id: sub.id, data: { confirmedAt: new Date().toISOString(), token: null, unsubToken }, overrideAccess: true })
      const u = unsubscribe(unsubToken)
      await send(
        sub.email,
        'Bienvenue sur DALIL',
        layout(
          'Bienvenue, votre inscription est confirmée.',
          '<p>Vous recevrez les nouvelles de DALIL : ouvertures de rubriques, nouveaux guides pratiques et adresses vérifiées, sans excès.</p><p>Chaque information publiée sur DALIL indique sa source et sa date de vérification.</p>',
          { label: 'Découvrir l’annuaire', href: `${SITE}/annuaire` },
          u.footer,
        ),
        { headers: u.headers },
      )
      ok = true
    }
  }
  redirect(`/newsletter/confirmation${ok ? '' : '?lien=invalide'}`)
}
