import { readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, test } from 'vitest'
import { ROUTES } from '@/modules/contenus'
import { ROBOTS_PRIVATE_PATHS, SITE_ROUTE_GROUPS } from '@/platform/siteRoutes'

const appRoot = join(process.cwd(), 'src/app/(site)/[lang]')

function pagePatterns(directory = appRoot): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name)
    if (statSync(path).isDirectory()) return pagePatterns(path)
    if (name !== 'page.tsx') return []
    const folder = relative(appRoot, directory).split(sep).filter(Boolean)
    return [folder.length ? `/${folder.join('/')}` : '/']
  })
}

describe('registre de l’arborescence', () => {
  test('classe chaque page dédiée de l’App Router exactement une fois', () => {
    const registered = [
      ...SITE_ROUTE_GROUPS.public,
      ...SITE_ROUTE_GROUPS.auth,
      ...SITE_ROUTE_GROUPS.private,
      ...SITE_ROUTE_GROUPS.legacyContent,
    ]
    expect([...registered].sort()).toEqual([...pagePatterns()].sort())
    expect(new Set(registered).size).toBe(registered.length)
  })

  test('conserve toutes les routes historiques comme source de contenu', () => {
    expect(ROUTES.every((route) => route.startsWith('/'))).toBe(true)
    expect(new Set(ROUTES).size).toBe(ROUTES.length)
    expect(SITE_ROUTE_GROUPS.legacyContent).toEqual(['/[...slug]'])
  })

  test('interdit robots sur les espaces de connexion et les pages privées', () => {
    for (const path of ['/connexion', '/mon-compte', '/espace-pro', '/missions', '/annonces/deposer', '/annonces/messagerie', '/newsletter/', '/login', '/inscription']) {
      expect(ROBOTS_PRIVATE_PATHS).toContain(path)
    }
  })
})
