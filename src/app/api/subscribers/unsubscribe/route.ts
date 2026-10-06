import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import { payload } from '@/lib/site'

const valid = (t: string) => /^[A-Za-z0-9_-]{20,64}$/.test(t)

async function unsubscribe(token: string) {
  if (!valid(token)) return false
  const p = await payload()
  const { docs } = await p.find({ collection: 'subscribers', where: { unsubToken: { equals: token } }, limit: 1, overrideAccess: true })
  if (!docs[0]) return false
  if (!docs[0].unsubscribedAt) await p.update({ collection: 'subscribers', id: docs[0].id, data: { unsubscribedAt: new Date().toISOString() }, overrideAccess: true })
  return true
}

/** Désinscription en un clic (RFC 8058) depuis Gmail / Yahoo, ou bouton de la page /newsletter/desinscription. */
export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get('token') ?? ''
  const ok = await unsubscribe(token)
  const body = await req.text().catch(() => '')
  // Bouton de la page : retour sur la page avec le résultat (303 → GET).
  if (!body.includes('List-Unsubscribe=One-Click')) {
    return NextResponse.redirect(new URL(`/newsletter/desinscription?token=${encodeURIComponent(token)}&fait=${ok ? '1' : '0'}`, req.url), 303)
  }
  return new Response(ok ? 'OK' : 'Lien invalide', { status: ok ? 200 : 400 })
}

/** Un simple GET (aperçu de lien, antivirus) ne désinscrit pas : il ouvre la page de confirmation. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token') ?? ''
  redirect(`/newsletter/desinscription?token=${encodeURIComponent(token)}`)
}
