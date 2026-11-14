import { describe, expect, it } from 'vitest'
import { parseCommand } from './commands'

describe('commandes Telegram', () => {
  it('texte libre = ordre pour le CEO', () => {
    expect(parseCommand('Priorité aux pharmacies de garde')).toEqual({ kind: 'ordre', text: 'Priorité aux pharmacies de garde' })
  })
  it('actions sur une tâche, avec numéro obligatoire', () => {
    expect(parseCommand('/valider 12')).toEqual({ kind: 'task', action: 'valider', id: 12, note: undefined })
    expect(parseCommand('/rejeter 7 sources trop anciennes')).toEqual({ kind: 'task', action: 'rejeter', id: 7, note: 'sources trop anciennes' })
    expect(parseCommand('/pause')).toMatchObject({ kind: 'erreur' })
    expect(parseCommand('/annuler abc')).toMatchObject({ kind: 'erreur' })
  })
  it('directive', () => {
    expect(parseCommand('/directive 12 garde le vendredi à part')).toEqual({ kind: 'directive', id: 12, text: 'garde le vendredi à part' })
    expect(parseCommand('/directive 12')).toMatchObject({ kind: 'erreur' })
  })
  it('rôles', () => {
    expect(parseCommand('/activer SEO-geo')).toEqual({ kind: 'role', action: 'activer', slug: 'seo-geo' })
    expect(parseCommand('/reserve analyste')).toEqual({ kind: 'role', action: 'reserve', slug: 'analyste' })
  })
  it('arrêt général', () => {
    expect(parseCommand('/stop')).toEqual({ kind: 'arret', mode: 'stop' })
    expect(parseCommand('/finir')).toEqual({ kind: 'arret', mode: 'drain' })
    expect(parseCommand('/couper')).toEqual({ kind: 'arret', mode: 'cut' })
    expect(parseCommand('/relancer')).toEqual({ kind: 'arret', mode: 'off' })
  })
  it('commande avec @nom_du_bot (groupes)', () => {
    expect(parseCommand('/etat@DalilBot')).toEqual({ kind: 'etat' })
  })
  it('commande inconnue', () => {
    expect(parseCommand('/supprimer 3')).toEqual({ kind: 'erreur', message: 'Commande inconnue : /supprimer. Tapez /aide.' })
  })
})
