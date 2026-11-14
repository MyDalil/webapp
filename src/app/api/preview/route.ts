import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { isStaffUser } from '@/platform/access'

/** Aperçu d’une fiche non publiée depuis /admin (réservé à l’équipe connectée), en français, arabe (`lang=ar`) ou anglais (`lang=en`). */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const slug = url.searchParams.get('slug') ?? ''
  const lang = url.searchParams.get('lang')
  const prefix = lang === 'ar' || lang === 'en' ? `/${lang}` : ''
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: req.headers })
  if (!isStaffUser(user) || !/^[a-z0-9-]+$/.test(slug)) return new Response('Accès réservé à l’équipe DALIL.', { status: 401 })
  ;(await draftMode()).enable()
  redirect(`${prefix}/adresses/${slug}`)
}
