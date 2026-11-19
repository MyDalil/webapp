import { describe, expect, it } from 'vitest'
import { ALT_MAX, altPrompt, clampAlt, needsAlt } from './altRules'

describe('texte alternatif', () => {
  it('manquant : vide ou nom de fichier', () => {
    expect(needsAlt({ alt: '' })).toBe(true)
    expect(needsAlt({ alt: 'IMG_2031', filename: 'IMG_2031.jpg' })).toBe(true)
    expect(needsAlt({ alt: 'Terrasse ombragée', filename: 'IMG_2031.jpg' })).toBe(false)
  })
  it('≤ 125 caractères, sans guillemets', () => {
    expect(clampAlt('« Une terrasse »')).toBe('Une terrasse')
    const long = clampAlt('Une salle lumineuse avec de grandes fenêtres, des tables en bois, des chaises vertes et un comptoir carrelé de zellige bleu et blanc au fond')
    expect(long.length).toBeLessThanOrEqual(ALT_MAX)
    expect(long.endsWith('…')).toBe(true)
  })
  it('sans lieu fourni, la consigne interdit les noms', () => {
    expect(altPrompt()).toContain('Ne cite aucun nom')
    expect(altPrompt('Jardin d’Essai')).toContain('Jardin d’Essai')
  })
})
