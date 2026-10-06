import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'

/** Aperçu d’une fiche non publiée depuis /admin (réservé à l’équipe connectée). */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const slug = url.searchParams.get('slug') ?? ''
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: req.headers })
  if (!user || !/^[a-z0-9-]+$/.test(slug)) return new Response('Accès réservé à l’équipe DALIL.', { status: 401 })
  ;(await draftMode()).enable()
  redirect(`/adresses/${slug}`)
}
