import { readFileSync } from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'

// Le vrai public/sw.js, exécuté hors navigateur (sans `self`, il n’installe aucun écouteur) : on lit ses règles pures.
type Req = { method?: string; url: string; mode?: string; origin?: string }
const ctx: Record<string, unknown> = { URL }
vm.runInNewContext(readFileSync(path.resolve(__dirname, '../../../public/sw.js'), 'utf8'), ctx)
const cacheRule = ctx.cacheRule as (r: Required<Req>) => 'static' | 'page' | 'bypass'
const storable = ctx.storable as (r: { status: number; type: string; redirected: boolean; headers: Headers }) => boolean

const O = 'https://www.mydalil.com'
const rule = ({ method = 'GET', url, mode = 'navigate', origin = O }: Req) => cacheRule({ method, url: url.startsWith('/') ? O + url : url, mode, origin })

describe('service worker : quoi mettre en cache', () => {
  it.each(['/', '/annuaire/sante-soins', '/praticiens', '/praticiens/dr-x', '/annonces/immobilier', '/annonces/immobilier/appartement-f3', '/en/annuaire', '/ar/services', '/recherche?q=pharmacie', '/espaces-verts', '/visionner'])(
    'page publique %s : réseau d’abord',
    (url) => expect(rule({ url })).toBe('page'),
  )

  it.each([
    '/admin', '/admin/collections/users', '/api/me', '/oauth/authorize', '/.well-known/oauth-authorization-server',
    '/connexion', '/connexion/particulier', '/mon-compte', '/espace', '/espace-pro', '/en/espace-pro', '/ar/mon-compte',
    '/annonces/messagerie', '/en/annonces/messagerie', '/annonces/deposer', '/onboarding', '/missions/12', '/visio/abc', '/fr/mon-compte',
  ])('espace privé %s : jamais en cache', (url) => expect(rule({ url })).toBe('bypass'))

  it('fichiers versionnés /_next/static : cache d’abord, quel que soit le mode', () => {
    expect(rule({ url: '/_next/static/chunks/app.js', mode: 'no-cors' })).toBe('static')
    expect(rule({ url: '/_next/static/media/inter.woff2', mode: 'cors' })).toBe('static')
  })

  it('ni POST, ni autre origine, ni requêtes de données (RSC, API, images)', () => {
    expect(rule({ url: '/annuaire', method: 'POST' })).toBe('bypass')
    expect(rule({ url: 'https://cdn.example.com/_next/static/a.js' })).toBe('bypass')
    expect(rule({ url: '/annuaire?_rsc=abc', mode: 'cors' })).toBe('bypass')
    expect(rule({ url: '/_next/image?url=x', mode: 'no-cors' })).toBe('bypass')
  })
})

describe('service worker : réponses gardées', () => {
  const res = (over: Partial<{ status: number; type: string; redirected: boolean; headers: Record<string, string> }> = {}) => ({
    status: 200, type: 'basic', redirected: false, ...over, headers: new Headers(over.headers ?? {}),
  })
  it('garde une réponse 200 du site sans session', () => expect(storable(res())).toBe(true))
  it('refuse un visiteur connecté (X-Dalil-Session)', () => expect(storable(res({ headers: { 'X-Dalil-Session': '1' } }))).toBe(false))
  it('refuse erreurs, redirections et réponses opaques', () => {
    expect(storable(res({ status: 404 }))).toBe(false)
    expect(storable(res({ status: 500 }))).toBe(false)
    expect(storable(res({ redirected: true }))).toBe(false)
    expect(storable(res({ type: 'opaque', status: 0 }))).toBe(false)
  })
})
