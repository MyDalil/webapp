import { describe, expect, it } from 'vitest'
import { distanceM, duplicatePairs, normalizePhone, parseCsv, planImport, toPlaces } from './csv'

describe('parseCsv', () => {
  it('BOM, point-virgule, guillemets, "" et retour à la ligne dans un champ', () => {
    const r = parseCsv('﻿nom;adresse;présentation\r\n"Café ""Le Square""";"12, rue Didouche; Alger";"Ligne 1\nLigne 2"\r\n\r\n')
    expect(r.delimiter).toBe(';')
    expect(r.headers).toEqual(['nom', 'adresse', 'présentation'])
    expect(r.rows).toEqual([['Café "Le Square"', '12, rue Didouche; Alger', 'Ligne 1\nLigne 2']])
  })
  it('virgule et UTF-8 (arabe)', () => {
    const r = parseCsv('name,city\nمطعم,Oran')
    expect(r.delimiter).toBe(',')
    expect(r.rows[0]).toEqual(['مطعم', 'Oran'])
  })
})

describe('normalizePhone', () => {
  it.each([
    ['0550 12 34 56', '+213550123456'],
    ['+213 (0)5 50 12 34 56', '+213550123456'],
    ['00213550123456', '+213550123456'],
    ['021 23 45 67', '+21321234567'],
    ['213550123456', '+213550123456'],
  ])('%s → %s', (a, b) => expect(normalizePhone(a)).toBe(b))
  it('illisible → null', () => {
    expect(normalizePhone('12')).toBeNull()
    expect(normalizePhone('')).toBeNull()
  })
})

describe('doublons', () => {
  it('distance', () => {
    expect(Math.round(distanceM({ lat: 36.75, lng: 3.05 }, { lat: 36.7504, lng: 3.05 }))).toBe(44)
  })
  const csv = 'nom;secteur;catégorie;wilaya;ville;téléphone;lat;lng\n' +
    'Café A;restaurants-gastronomie;Cafés;Alger;Alger;0550123456;36.75;3.05\n' +
    'Café B;restaurants-gastronomie;Cafés;16;Alger;;36.7504;3.05\n' +
    'Café C;restaurants-gastronomie;Cafés;16;Alger;;36.76;3.05\n' +
    'Café D;restaurants-gastronomie;Cafés;16;Alger;+213 21 00 00 01;;\n' +
    'Sans secteur;;Cafés;16;Alger;;;\n' +
    'Café E;restaurants-gastronomie;Cafés;16;Alger;;99;3\n'
  it('plan : téléphone, < 50 m, nom + commune, erreurs par ligne', () => {
    const { lines } = toPlaces(parseCsv(csv))
    const plan = planImport(lines, [
      { id: 7, name: 'Autre nom', city: 'Alger', phone: '+213550123456' },
      { id: 8, name: 'café  c', city: 'ALGER' },
      { id: 9, name: 'Ailleurs', city: 'Oran', phone: '021000001' },
    ])
    expect(plan.duplicates.map((d) => [d.line, d.reason])).toEqual([[2, 'téléphone'], [4, 'nom et commune'], [5, 'téléphone']])
    expect(plan.toCreate.map((t) => t.line)).toEqual([3])
    expect(plan.errors.map((e) => e.line)).toEqual([6, 7])
    expect(plan.errors[0].errors).toContain('secteur manquant')
    expect(plan.errors[1].errors).toContain('latitude hors de l’Algérie')
  })
  it('doublon à l’intérieur du fichier (< 50 m)', () => {
    const { lines } = toPlaces(parseCsv(csv))
    const plan = planImport(lines.slice(0, 2), [])
    expect(plan.duplicates[0]).toMatchObject({ line: 3, reason: 'coordonnées', existing: { line: 2 } })
    expect(plan.duplicates[0].distanceM).toBeLessThan(50)
  })
  it('wilaya par défaut et secteur par titre', () => {
    const { lines } = toPlaces(parseCsv('nom,secteur,categorie,ville\nX,Santé & soins,Pharmacies,Blida'), { wilaya: 'Blida' })
    expect(lines[0].errors.filter((e) => e.startsWith('wilaya'))).toEqual([])
  })
  it('paires de doublons (contrôle)', () => {
    const pairs = duplicatePairs([{ id: 1, name: 'A', lat: 36.75, lng: 3.05 }, { id: 2, name: 'B', lat: 36.7501, lng: 3.0501 }, { id: 3, name: 'C', lat: 35, lng: 1 }])
    expect(pairs.map((p) => [p.a.id, p.b.id, p.reason])).toEqual([[1, 2, 'coordonnées']])
  })
})

describe('import par lots', () => {
  const head = 'nom;secteur;categorie;wilaya;commune;telephone;lat;lng\n'
  const row = (i: number, tel = `0550 00 ${String(i).padStart(4, '0').slice(0, 2)} ${String(i).padStart(4, '0').slice(2)}`) => `Lieu ${i};restaurants-gastronomie;Cafés;16;Alger;${tel};;`
  it('limite unique de 1 Mo et lot de 150 lignes', async () => {
    const { MAX_CSV_BYTES, IMPORT_BATCH } = await import('./csv')
    expect(MAX_CSV_BYTES).toBe(1024 * 1024)
    expect(IMPORT_BATCH).toBe(150)
  })
  it('planBatch : lot [debut, fin), suite, puis null à la fin', async () => {
    const { planBatch } = await import('./csv')
    const csv = head + Array.from({ length: 320 }, (_, i) => row(i + 1)).join('\n')
    const { lines } = toPlaces(parseCsv(csv))
    const a = planBatch(lines, 0, 150, [])
    expect([a.debut, a.fin, a.suite]).toEqual([0, 150, 150])
    const c = planBatch(lines, 300, 150, [])
    expect([c.debut, c.fin, c.suite]).toEqual([300, 320, null])
    expect(c.toCreate).toHaveLength(20)
    expect(c.errors).toEqual([])
  })
  it('planBatch : doublon d’une ligne d’un lot précédent (simulation comprise) et de la base', async () => {
    const { planBatch } = await import('./csv')
    const csv = head + [row(1, '0550 11 22 33'), row(2), row(3, '0550112233')].join('\n')
    const { lines } = toPlaces(parseCsv(csv))
    const b = planBatch(lines, 2, 150, [])
    expect(b.duplicates).toMatchObject([{ line: 4, reason: 'téléphone', existing: { line: 2 } }])
    const db = planBatch(lines, 1, 150, [{ id: 9, name: 'Lieu 2', city: 'alger' }])
    expect(db.duplicates[0]).toMatchObject({ line: 3, reason: 'nom et commune', existing: { id: 9 } })
  })
  it('dupKeys : fin de téléphone, nom + commune normalisés, boîte ±0,001°', async () => {
    const { dupKeys } = await import('./csv')
    const k = dupKeys([{ name: 'Café L’Étoile', city: 'Béjaïa', sector: 's', category: 'c', wilaya: '6', phone: '+213 550 12 34 56', lat: 36.75, lng: 5.06 }])
    expect(k.phones).toEqual(['550123456'])
    expect(k.names).toEqual(['cafe letoile|bejaia'])
    expect(k.boxes[0].a).toBeCloseTo(36.749)
    expect(k.boxes[0].d).toBeCloseTo(5.061)
  })
})
