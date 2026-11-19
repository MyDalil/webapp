import { describe, expect, test } from 'vitest'
import { getPathMatch } from 'next/dist/shared/lib/router/utils/path-match'
import { SITE_REWRITES } from '@/platform/rewrites'

// Même moteur de correspondance que Next.js : /@slug → /pro/slug.
const rule = (src: string) => SITE_REWRITES.afterFiles.find((r) => r.source === src)!
const fr = getPathMatch(rule('/@:slug([a-z0-9-]+)').source, { removeUnnamedParams: true, strict: true })
const other = getPathMatch(rule('/:lang(en|ar)/@:slug([a-z0-9-]+)').source, { removeUnnamedParams: true, strict: true })

describe('lien court /@slug', () => {
  test('reconnaît /@slug et /en/@slug, pas les autres chemins', () => {
    expect(fr('/@cafe-du-port')).toEqual({ slug: 'cafe-du-port' })
    expect(other('/ar/@cafe-du-port')).toEqual({ lang: 'ar', slug: 'cafe-du-port' })
    expect(fr('/cafe-du-port')).toBe(false)
    expect(fr('/@Cafe/x')).toBe(false)
  })
})
