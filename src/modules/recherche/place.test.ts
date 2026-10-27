import { describe, expect, it } from 'vitest'
import { searchWords } from '@/platform/search/store'
import { detectPlace } from './place'

describe('searchWords', () => {
  it('retire accents, majuscules et ponctuation', () => {
    expect(searchWords('Hôpital, Tizi-Ouzou !')).toEqual(['hopital', 'tizi', 'ouzou'])
  })
})

describe('detectPlace', () => {
  it('reconnaît une wilaya et la retire de la recherche', () => {
    expect(detectPlace('dentiste à Oran')).toMatchObject({ wilaya: '31', label: 'Oran', rest: 'dentiste' })
  })
  it('préfère le nom le plus long (Tizi Ouzou)', () => {
    const r = detectPlace('plombier tizi ouzou')
    expect(r.wilaya).toBe('15')
    expect(r.rest).toBe('plombier')
  })
  it('sans lieu, rend la recherche telle quelle', () => {
    expect(detectPlace('hopital')).toEqual({ wilaya: null, label: null, rest: 'hopital', near: null })
    expect(detectPlace('mosquée draria')).toMatchObject({ wilaya: '16', label: 'Draria', rest: 'mosquee', near: { lat: 36.71389, lng: 2.99778 } })
  })
})
