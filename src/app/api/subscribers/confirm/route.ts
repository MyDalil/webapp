import { redirect } from 'next/navigation'
import { payload } from '@/lib/site'

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token') ?? ''
  let ok = false
  if (/^[A-Za-z0-9_-]{20,64}$/.test(token)) {
    const p = await payload()
    const { docs } = await p.find({ collection: 'subscribers', where: { token: { equals: token } }, limit: 1, overrideAccess: true })
    if (docs[0]) {
      await p.update({ collection: 'subscribers', id: docs[0].id, data: { confirmedAt: new Date().toISOString(), token: null }, overrideAccess: true })
      ok = true
    }
  }
  redirect(`/newsletter/confirmation${ok ? '' : '?lien=invalide'}`)
}
