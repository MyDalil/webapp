import { describe, expect, it } from 'vitest'
import { getPathMatch } from 'next/dist/shared/lib/router/utils/path-match'
import { LOCALE_REWRITE_SOURCE, MCP_HOST, SITE_REWRITES } from './rewrites'

// Même moteur de correspondance que Next.js pour les réécritures.
const match = getPathMatch(LOCALE_REWRITE_SOURCE, { removeUnnamedParams: true, strict: true })
const rewritten = (path: string) => match(path) !== false

describe('réécriture vers /fr', () => {
  it.each([
    '/annuaire',
    '/annuaire/sante-soins',
    '/praticiens/dr-x',
    '/recherche',
    '/frites',
    '/english',
    '/arabe',
    '/apis',
    '/administration',
    '/iconsx',
    '/well-known',
    '/sw.json',
    '/llms-full.txt',
    '/oauthx',
    '/manifest',
  ])('réécrit %s', (path) => expect(rewritten(path)).toBe(true))

  it.each([
    '/fr',
    '/fr/annuaire',
    '/en',
    '/en/annuaire',
    '/ar/annonces',
    '/api/mcp',
    '/admin',
    '/admin/collections/users',
    '/_next/static/chunks/a.js',
    '/sitemaps/pages.xml',
    '/.well-known/oauth-authorization-server',
    '/.well-known/oauth-protected-resource/api/mcp',
    '/oauth',
    '/oauth/authorize',
    '/icons/icon-192.png',
    '/manifest.webmanifest',
    '/sw.js',
    '/llms.txt',
  ])('laisse %s tel quel', (path) => expect(rewritten(path)).toBe(false))

  it('le point de .well-known et des fichiers est littéral', () => {
    expect(rewritten('/xwell-known/a')).toBe(true)
    expect(rewritten('/swxjs')).toBe(true)
  })
})

describe('domaine MCP', () => {
  it('/ et /admin de mcp.mydalil.com vont vers /api/mcp, avant les pages', () => {
    expect(SITE_REWRITES.beforeFiles).toEqual([
      { source: '/', has: [{ type: 'host', value: MCP_HOST }], destination: '/api/mcp' },
      { source: '/admin', has: [{ type: 'host', value: MCP_HOST }], destination: '/api/mcp/admin' },
    ])
    expect(MCP_HOST).toBe('mcp.mydalil.com')
  })
})
