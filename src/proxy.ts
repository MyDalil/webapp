import { NextResponse, type NextRequest } from 'next/server'

/**
 * /admin s’ouvre en français tant que la personne n’a pas choisi une autre langue
 * (sinon Payload suivrait la langue du navigateur). Limité à /admin : le site public n’est pas concerné.
 */
const COOKIE = 'payload-lng'

export function proxy(request: NextRequest) {
  if (request.cookies.has(COOKIE)) return NextResponse.next()
  const headers = new Headers(request.headers)
  headers.set('cookie', [request.headers.get('cookie'), `${COOKIE}=fr`].filter(Boolean).join('; '))
  const response = NextResponse.next({ request: { headers } })
  response.cookies.set(COOKIE, 'fr', { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
  return response
}

export const config = { matcher: ['/admin', '/admin/:path*'] }
