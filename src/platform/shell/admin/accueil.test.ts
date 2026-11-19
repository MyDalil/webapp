import { describe, expect, it } from 'vitest'
import { A_RELIRE, CASES, controleLignes, isTeam, listHref, shown, whereParams } from './accueil'

describe('accueil de l’équipe', () => {
  it('liens filtrés lisibles par la liste de l’admin', () => {
    expect(listHref({ collection: 'places', where: { _status: { equals: 'draft' } } })).toBe('/admin/collections/places?where%5B_status%5D%5Bequals%5D=draft')
    expect(whereParams({ status: { in: ['new', 'needs_info'] } })).toEqual(['where%5Bstatus%5D%5Bin%5D%5B0%5D=new', 'where%5Bstatus%5D%5Bin%5D%5B1%5D=needs_info'])
  })
  it('cases attendues', () => {
    expect(A_RELIRE.map((t) => t.collection)).toEqual(['places', 'practitioners', 'providers', 'classifieds', 'procedures'])
    expect(CASES.map((t) => t.label)).toEqual(['Contributions', 'Photos à contrôler', 'Demandes de mise en avant', 'Revendications', 'Abonnements à activer'])
  })
  it('équipe seulement', () => {
    expect(isTeam({ collection: 'users', role: 'editor' })).toBe(true)
    expect(isTeam({ collection: 'users', role: 'conseiller' })).toBe(false)
    expect(isTeam({ collection: 'members', role: 'admin' })).toBe(false)
    expect(isTeam(null)).toBe(false)
  })
  it('jamais de nombre inventé', () => {
    expect(shown(0)).toBe('0')
    expect(shown(null)).toBe('—')
  })
})

describe('rapport de contrôle', () => {
  it('traduit le rapport en lignes simples', () => {
    const lignes = controleLignes({
      fiches: {
        sansTelephone: { total: 2, exemples: [{ id: 1, name: 'Café A', city: 'Alger' }] },
        sansAdresse: { total: 0, exemples: [] },
        sansCoordonnees: { erreur: 'panne' },
        doublons: { examines: 10, paires: [{ a: { id: 1, name: 'A' }, b: { id: 2, name: 'B' }, raison: 'même téléphone' }] },
      },
      medias: { photosSansTexteAlternatif: 3, aControler: 0 },
      erreursRecentes7j: { total: 0, dernieres: [] },
      sauvegarde: { ilYaHeures: 5, enRetard: false },
      variablesAbsentes: ['RESEND_API_KEY'],
      clesMcpDeclarees: 1,
      equipe: [{ nom: 'Saïd', role: 'patron' }],
    })
    const by = Object.fromEntries(lignes.map((l) => [l.label, l]))
    expect(by['Adresses publiées sans téléphone']).toMatchObject({ valeur: '2', alerte: true, exemples: ['Café A — Alger (#1)'] })
    expect(by['Adresses publiées sans adresse'].alerte).toBe(false)
    expect(by['Adresses publiées sans position sur la carte']).toMatchObject({ valeur: 'Contrôle impossible (panne)', alerte: true })
    expect(by['Doublons probables'].valeur).toBe('1 sur 10 adresses')
    expect(by['Dernière sauvegarde']).toMatchObject({ valeur: 'il y a 5 h', alerte: false })
    expect(by['Réglages manquants sur Vercel']).toMatchObject({ valeur: 'RESEND_API_KEY', alerte: true })
    expect(by['Comptes de l’équipe'].exemples).toEqual(['Saïd — patron'])
  })
  it('sauvegarde absente = alerte', () => {
    const l = controleLignes({ sauvegarde: { ilYaHeures: null, enRetard: true } }).find((x) => x.label === 'Dernière sauvegarde')
    expect(l).toMatchObject({ valeur: 'aucune sauvegarde réussie', alerte: true })
  })
})
