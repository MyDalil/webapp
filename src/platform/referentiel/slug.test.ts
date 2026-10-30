import { describe, expect, it } from 'vitest'
import { slugify } from './slug'

describe('slugify', () => {
  it('garde les noms latins', () => expect(slugify('Tizi Ouzou')).toBe('tizi-ouzou'))
  it('translittère les noms en arabe', () => expect(slugify('ثانوية حبة عبد المجيد')).toMatch(/^[a-z0-9-]+$/))
  it('ne rend jamais vide un nom arabe', () => expect(slugify('المغير').length).toBeGreaterThan(2))
})
