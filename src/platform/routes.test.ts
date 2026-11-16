import { describe, expect, test } from 'vitest'
import { SITE_REDIRECTS } from './routes'

const rule = (source: string, host?: string) =>
  SITE_REDIRECTS.find((item) => item.source === source && (!host || item.has?.some((condition) => condition.type === 'host' && condition.value === host)))

describe('redirections canoniques', () => {
  test('redirige le domaine Vercel de production vers www en conservant le chemin', () => {
    expect(rule('/:path*', 'mydalil.vercel.app')).toMatchObject({
      destination: 'https://www.mydalil.com/:path*',
      permanent: true,
    })
  })

  test('ne redirige jamais le domaine Preview vers la production', () => {
    expect(SITE_REDIRECTS.some((item) => item.has?.some((condition) => condition.type === 'host' && condition.value === 'preview.mydalil.com'))).toBe(false)
  })

  test.each([
    ['/login', '/connexion'],
    ['/signin', '/connexion'],
    ['/inscription', '/connexion/particulier?tab=signup'],
    ['/signup', '/connexion/particulier?tab=signup'],
    ['/mot-de-passe-oublie', '/connexion'],
    ['/compte', '/mon-compte'],
    ['/professionnels/espace', '/espace-pro'],
  ])('redirige %s vers %s', (source, destination) => {
    expect(rule(source)).toMatchObject({ destination, permanent: true })
  })

  test.each([
    ['/en/login', '/en/connexion'],
    ['/ar/login', '/ar/connexion'],
    ['/en/inscription', '/en/connexion/particulier?tab=signup'],
    ['/ar/compte', '/ar/mon-compte'],
  ])('conserve la langue pour %s', (source, destination) => {
    expect(rule(source)).toMatchObject({ destination, permanent: true })
  })

  test('retire le préfixe français et l’ancienne route test', () => {
    expect(rule('/fr/:path*')).toMatchObject({ destination: '/:path*', permanent: true })
    expect(rule('/test')).toMatchObject({ destination: '/mon-compte', permanent: true })
  })
})
