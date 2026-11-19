import { describe, expect, it } from 'vitest'
import { llmsText } from './llms'
import { RUBRICS } from './nav'

describe('llms.txt', () => {
  const t = llmsText('https://www.mydalil.com')
  it('commence par le titre et le résumé (format llmstxt.org)', () => {
    expect(t.startsWith('# DALIL\n\n> ')).toBe(true)
  })
  it('donne le serveur MCP public et le plan du site', () => {
    expect(t).toContain('(https://www.mydalil.com/api/mcp)')
    expect(t).toContain('(https://www.mydalil.com/sitemap.xml)')
  })
  it('reprend les rubriques du menu, sans les liens de compte', () => {
    for (const r of RUBRICS) expect(t).toContain(`## ${r.label}`)
    expect(t).not.toContain('/mon-compte')
    expect(t).not.toContain('/annonces/deposer')
  })
})
