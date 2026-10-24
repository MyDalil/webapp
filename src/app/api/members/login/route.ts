import { NextResponse } from 'next/server'
import { generatePayloadCookie } from 'payload/shared'
import { clean, fail, payload } from '@/platform/http'
import { guard } from '@/platform/security/rateLimit'

/**
 * Connexion des comptes publics (remplace la route Payload du même chemin) : limitation par adresse IP
 * en plus du verrouillage par compte (8 essais) déjà prévu par Payload.
 */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}))
  const email = clean(b.email, 200).toLowerCase()
  const limited = await guard('login', 20, 15 * 60, email || undefined)
  if (limited) return limited
  const p = await payload()
  try {
    const r = await p.login({ collection: 'members', data: { email, password: typeof b.password === 'string' ? b.password : '' } })
    const cookie = generatePayloadCookie({ collectionAuthConfig: p.collections.members.config.auth, cookiePrefix: p.config.cookiePrefix, token: r.token ?? '' })
    return NextResponse.json({ message: 'Connecté.', exp: r.exp }, { headers: { 'set-cookie': cookie, 'cache-control': 'no-store' } })
  } catch (e) {
    const status = (e as { status?: number }).status ?? 401
    return fail(e instanceof Error ? e.message : 'Connexion impossible.', status === 500 ? 401 : status)
  }
}
