import { describe, expect, test } from 'vitest'
import { PREVIEW_SITE, PRODUCTION_SITE, siteForEnvironment } from './site'

describe('origine publique de DALIL', () => {
  test('utilise www.mydalil.com en production', () => {
    expect(PRODUCTION_SITE).toBe('https://www.mydalil.com')
    expect(siteForEnvironment('production')).toBe('https://www.mydalil.com')
  })

  test('utilise preview.mydalil.com en preview', () => {
    expect(PREVIEW_SITE).toBe('https://preview.mydalil.com')
    expect(siteForEnvironment('preview')).toBe('https://preview.mydalil.com')
  })

  test('normalise une origine personnalisée autorisée', () => {
    expect(siteForEnvironment('development', 'https://local.mydalil.test/')).toBe('https://local.mydalil.test')
  })

  test('ne publie jamais une origine vercel.app comme canonique', () => {
    expect(siteForEnvironment('production', 'https://mydalil.vercel.app')).toBe('https://www.mydalil.com')
    expect(siteForEnvironment('preview', 'https://mydalil-git-preview.vercel.app')).toBe('https://preview.mydalil.com')
  })
})
