import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  // Tout sauf l'admin Payload, l'API, les fichiers Next et les fichiers statiques.
  matcher: ['/((?!admin|api|_next|_vercel|.*\\..*).*)'],
}
