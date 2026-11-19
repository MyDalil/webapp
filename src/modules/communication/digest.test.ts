import { describe, expect, it } from 'vitest'
import { composeDigest, telegramSummary } from './digest'

describe('newsletter', () => {
  it('compose à partir des fiches seulement', () => {
    const d = composeDigest([{ name: 'Le Tajine', city: 'El Biar', category: 'Restaurants', intro: 'Cuisine algéroise maison. Terrasse.', slug: 'le-tajine-el-biar' }, { name: 'Café B', city: 'Alger' }], { wilaya: 'Alger', site: 'https://www.mydalil.com' })
    expect(d.title).toBe('Nouvelles adresses sur DALIL — à Alger')
    expect(d.body).toContain('Le Tajine — Restaurants, El Biar\nCuisine algéroise maison.\nhttps://www.mydalil.com/adresses/le-tajine-el-biar')
    expect(d.body).not.toContain('Terrasse')
    expect(d.body).toContain('Café B — Alger')
    const t = telegramSummary(d, 'https://www.mydalil.com')
    expect(t.buttons[0].url).toBe('https://www.mydalil.com/annuaire')
  })
})
